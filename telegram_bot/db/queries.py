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
) -> int | str:
    """
    Validates linking token and creates telegram_users entry.
    Returns user_id (int) on success, or one of:
      "invalid_token"  — token not found / expired / already used
      "telegram_taken" — this Telegram account is linked to a different Metriq Flow profile
      "user_taken"     — this Metriq Flow profile already has a Telegram account linked
    """
    async with pool.acquire() as conn:
        async with conn.transaction():
            # 1. Validate token first
            row = await conn.fetchrow(
                """
                SELECT user_id FROM telegram_link_tokens
                WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()
                """,
                token,
            )
            if not row:
                return "invalid_token"

            user_id: int = row["user_id"]

            # 2. Check if this Telegram account is already linked
            existing_tg = await conn.fetchrow(
                "SELECT user_id FROM telegram_users WHERE telegram_id = $1",
                telegram_id,
            )
            if existing_tg:
                if existing_tg["user_id"] == user_id:
                    # Re-linking same pair — idempotent, just mark token used
                    await conn.execute(
                        "UPDATE telegram_link_tokens SET used_at = NOW() WHERE token = $1", token,
                    )
                    return user_id
                return "telegram_taken"

            # 3. Check if this Metriq Flow profile already has a Telegram linked
            existing_user = await conn.fetchrow(
                "SELECT telegram_id FROM telegram_users WHERE user_id = $1",
                user_id,
            )
            if existing_user:
                return "user_taken"

            # 4. All clear — mark token used and insert
            await conn.execute(
                "UPDATE telegram_link_tokens SET used_at = NOW() WHERE token = $1", token,
            )
            await conn.execute(
                """
                INSERT INTO telegram_users (user_id, telegram_id, telegram_username, first_name)
                VALUES ($1, $2, $3, $4)
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


async def get_active_channel_count(pool: asyncpg.Pool, user_id: int) -> int:
    async with pool.acquire() as conn:
        return await conn.fetchval(
            "SELECT COUNT(*) FROM telegram_channels WHERE user_id = $1 AND is_active = TRUE",
            user_id,
        ) or 0


import datetime
import logging

_plan_logger = logging.getLogger(__name__)

PLAN_TG_LIMITS: dict[str, int | None] = {
    "free":     1,
    "pro":      5,
    "agency":   20,
    "ultimate": None,
}


async def get_user_tg_channel_limit(pool: asyncpg.Pool, user_id: int) -> int | None:
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT plan, plan_expires_at FROM users WHERE id = $1",
                user_id,
            )
    except Exception:
        _plan_logger.exception("get_user_tg_channel_limit: DB error for user_id=%s, defaulting to free", user_id)
        return PLAN_TG_LIMITS["free"]

    if not row:
        return PLAN_TG_LIMITS["free"]

    plan = row["plan"] or "free"
    expires = row["plan_expires_at"]

    if plan not in PLAN_TG_LIMITS:
        _plan_logger.warning("get_user_tg_channel_limit: unknown plan %r for user_id=%s, treating as free", plan, user_id)
        plan = "free"

    if plan not in ("free", "ultimate") and expires is not None:
        now_utc = datetime.datetime.now(datetime.timezone.utc)
        # asyncpg returns TIMESTAMPTZ as aware datetime; guard against naive just in case
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=datetime.timezone.utc)
        if expires < now_utc:
            plan = "free"

    return PLAN_TG_LIMITS[plan]


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
    updates: list[tuple[int, int, int, int, int]],  # (views, forwards, comments, channel_id, message_id)
) -> None:
    if not updates:
        return
    async with pool.acquire() as conn:
        await conn.executemany(
            """
            UPDATE telegram_posts
            SET views = $1, forwards = $2, comments = $3, collected_at = NOW()
            WHERE channel_id = $4 AND message_id = $5
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
    comments: int = 0,
) -> None:
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO telegram_posts
                (channel_id, message_id, text, views, forwards, reactions_total, comments, has_media, posted_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (channel_id, message_id) DO UPDATE
                SET views           = EXCLUDED.views,
                    forwards        = EXCLUDED.forwards,
                    reactions_total = EXCLUDED.reactions_total,
                    comments        = EXCLUDED.comments,
                    collected_at    = NOW()
            """,
            channel_id, message_id, text, views, forwards, reactions_total, comments, has_media, posted_at,
        )


async def upsert_member_count_snapshot(
    pool: asyncpg.Pool,
    channel_id: int,
    count: int,
) -> None:
    """Insert snapshot; deduplicate within the same hour."""
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO member_count_snapshots (channel_id, count)
            SELECT $1, $2
            WHERE NOT EXISTS (
                SELECT 1 FROM member_count_snapshots
                WHERE channel_id = $1
                  AND recorded_at >= date_trunc('hour', NOW())
            )
            """,
            channel_id, count,
        )


# ─── Auto-report schedules ───────────────────────────────────────────────────

async def get_user_schedules(pool: asyncpg.Pool, user_id: int) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            SELECT rs.id, rs.title, rs.source, rs.format, rs.frequency_days,
                   rs.enabled, rs.paused, rs.next_send_at, rs.last_sent_at, rs.last_status,
                   sc_tg.enabled   AS tg_enabled,
                   sc_em.enabled   AS email_enabled,
                   sc_em.email     AS email_address
            FROM report_schedules rs
            LEFT JOIN schedule_channels sc_tg ON sc_tg.schedule_id = rs.id AND sc_tg.channel = 'telegram'
            LEFT JOIN schedule_channels sc_em ON sc_em.schedule_id = rs.id AND sc_em.channel  = 'email'
            WHERE rs.user_id = $1
            ORDER BY rs.created_at DESC
            """,
            user_id,
        )


async def toggle_schedule_telegram(pool: asyncpg.Pool, schedule_id: int, user_id: int, enabled: bool) -> bool:
    """Toggle Telegram channel for a schedule. Returns True if schedule belongs to user."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id FROM report_schedules WHERE id = $1 AND user_id = $2",
            schedule_id, user_id,
        )
        if not row:
            return False
        await conn.execute(
            """
            INSERT INTO schedule_channels (schedule_id, channel, enabled)
            VALUES ($1, 'telegram', $2)
            ON CONFLICT (schedule_id, channel) DO UPDATE SET enabled = $2
            """,
            schedule_id, enabled,
        )
        return True


async def toggle_schedule_enabled(pool: asyncpg.Pool, schedule_id: int, user_id: int, enabled: bool) -> bool:
    async with pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE report_schedules SET enabled = $1 WHERE id = $2 AND user_id = $3",
            enabled, schedule_id, user_id,
        )
        return result != "UPDATE 0"
