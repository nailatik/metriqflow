from __future__ import annotations

from datetime import datetime
from typing import Optional

import asyncpg


# ─── User / Linking ──────────────────────────────────────────────────────────

async def get_linked_user(pool: asyncpg.Pool, telegram_id: int) -> Optional[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            SELECT
                u.id, u.email, u.full_name, u.organization, u.phone, u.created_at,
                COUNT(DISTINCT tc.id) FILTER (WHERE tc.is_active) AS channel_count,
                COUNT(DISTINCT tp.id)                              AS post_count
            FROM telegram_users tu
            JOIN users u ON u.id = tu.user_id
            LEFT JOIN telegram_channels tc ON tc.user_id = u.id
            LEFT JOIN telegram_posts    tp ON tp.channel_id = tc.channel_id
            WHERE tu.telegram_id = $1
            GROUP BY u.id, u.email, u.full_name, u.organization, u.phone, u.created_at
            """,
            telegram_id,
        )


async def validate_and_use_token(
    pool: asyncpg.Pool,
    token: str,
    telegram_id: int,
    username: str | None,
    first_name: str,
) -> Optional[int]:
    """Validates linking token, creates telegram_users entry. Returns user_id or None."""
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                """
                SELECT user_id FROM telegram_link_tokens
                WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()
                """,
                token,
            )
            if not row:
                return None

            user_id: int = row["user_id"]

            await conn.execute(
                "UPDATE telegram_link_tokens SET used_at = NOW() WHERE token = $1",
                token,
            )
            await conn.execute(
                """
                INSERT INTO telegram_users (user_id, telegram_id, telegram_username, first_name)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (telegram_id) DO UPDATE
                    SET user_id = EXCLUDED.user_id,
                        telegram_username = EXCLUDED.telegram_username,
                        first_name = EXCLUDED.first_name,
                        linked_at = NOW()
                """,
                user_id, telegram_id, username, first_name,
            )
            return user_id


# ─── Channels ────────────────────────────────────────────────────────────────

async def upsert_channel(
    pool: asyncpg.Pool,
    user_id: int,
    channel_id: int,
    title: str,
    username: str | None,
    member_count: int | None,
) -> None:
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO telegram_channels (user_id, channel_id, title, username, member_count)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (channel_id) DO UPDATE
                SET user_id = EXCLUDED.user_id,
                    title = EXCLUDED.title,
                    username = EXCLUDED.username,
                    member_count = EXCLUDED.member_count,
                    is_active = TRUE
            """,
            user_id, channel_id, title, username, member_count,
        )


async def deactivate_channel(pool: asyncpg.Pool, channel_id: int) -> None:
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE telegram_channels SET is_active = FALSE WHERE channel_id = $1",
            channel_id,
        )


async def get_user_channels(pool: asyncpg.Pool, user_id: int) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            SELECT channel_id, title, username, member_count, added_at
            FROM telegram_channels
            WHERE user_id = $1 AND is_active = TRUE
            ORDER BY added_at DESC
            """,
            user_id,
        )


async def get_channel_by_id(
    pool: asyncpg.Pool, channel_id: int
) -> Optional[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            "SELECT id, user_id FROM telegram_channels WHERE channel_id = $1 AND is_active = TRUE",
            channel_id,
        )


async def get_channel_stats(
    pool: asyncpg.Pool, channel_id: int
) -> Optional[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            SELECT
                tc.title, tc.username, tc.member_count,
                COUNT(tp.id)             AS post_count,
                COALESCE(SUM(tp.views), 0)  AS total_views,
                COALESCE(AVG(tp.views), 0)  AS avg_views,
                COALESCE(SUM(tp.forwards), 0) AS total_forwards
            FROM telegram_channels tc
            LEFT JOIN telegram_posts tp ON tp.channel_id = tc.channel_id
            WHERE tc.channel_id = $1
            GROUP BY tc.title, tc.username, tc.member_count
            """,
            channel_id,
        )


# ─── Posts ───────────────────────────────────────────────────────────────────

async def get_posts_for_report(
    pool: asyncpg.Pool,
    channel_id: int,
    period: str,
) -> list[asyncpg.Record]:
    interval_map = {
        "24h": "NOW() - INTERVAL '24 hours'",
        "7d":  "NOW() - INTERVAL '7 days'",
        "30d": "NOW() - INTERVAL '30 days'",
    }
    where_extra = f"AND posted_at >= {interval_map[period]}" if period in interval_map else ""
    async with pool.acquire() as conn:
        return await conn.fetch(
            f"""
            SELECT
                message_id,
                posted_at,
                views,
                reactions_total,
                forwards,
                has_media,
                CASE WHEN views > 0
                    THEN ROUND((reactions_total + forwards)::numeric / views * 100, 2)
                    ELSE 0
                END AS engagement_rate,
                LEFT(COALESCE(text, ''), 80) AS text_preview
            FROM telegram_posts
            WHERE channel_id = $1 {where_extra}
            ORDER BY posted_at DESC
            """,
            channel_id,
        )


async def get_posts_grouped_by_channel(
    pool: asyncpg.Pool,
    interval: str,
) -> dict[int, list[int]]:
    """Return {tg_channel_id: [message_id, ...]} for posts within interval (e.g. '24 hours')."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""
            SELECT channel_id, message_id
            FROM telegram_posts
            WHERE posted_at >= NOW() - INTERVAL '{interval}'
            ORDER BY channel_id
            """,
        )
    result: dict[int, list[int]] = {}
    for row in rows:
        result.setdefault(row["channel_id"], []).append(row["message_id"])
    return result


async def bulk_update_post_stats(
    pool: asyncpg.Pool,
    updates: list[tuple[int, int, int, int]],  # (views, forwards, channel_id, message_id)
) -> None:
    if not updates:
        return
    async with pool.acquire() as conn:
        await conn.executemany(
            """
            UPDATE telegram_posts
            SET views = $1, forwards = $2, collected_at = NOW()
            WHERE channel_id = $3 AND message_id = $4
            """,
            updates,
        )


async def upsert_post(
    pool: asyncpg.Pool,
    channel_id: int,
    message_id: int,
    text: str | None,
    views: int,
    forwards: int,
    reactions_total: int,
    has_media: bool,
    posted_at: datetime | None,
) -> None:
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO telegram_posts
                (channel_id, message_id, text, views, forwards, reactions_total, has_media, posted_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (channel_id, message_id) DO UPDATE
                SET views           = EXCLUDED.views,
                    forwards        = EXCLUDED.forwards,
                    reactions_total = EXCLUDED.reactions_total,
                    collected_at    = NOW()
            """,
            channel_id, message_id, text, views, forwards, reactions_total, has_media, posted_at,
        )
