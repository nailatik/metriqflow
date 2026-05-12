"""
Dual-cadence scheduler:
  Every 10 min  — refresh views/forwards for posts from last 24 h (via Telethon MTProto)
  Every 60 min  — refresh views for posts from last 7 d  +  update member_count for all channels
"""
from __future__ import annotations

import asyncio
import logging

import asyncpg
from aiogram import Bot

from db import queries
from telethon_client import fetch_message_stats

logger = logging.getLogger(__name__)

_FAST_INTERVAL  = 10 * 60   # 10 minutes
_SLOW_EVERY_N   = 6          # every 6 fast ticks = 60 minutes
_BATCH_SIZE     = 100        # Telegram GetMessages max per call
_INTER_CHANNEL  = 0.5        # seconds between channels (avoid flood)


# ─── Views refresh ────────────────────────────────────────────────────────────

async def _refresh_views(pool: asyncpg.Pool, interval: str) -> None:
    posts_by_channel = await queries.get_posts_grouped_by_channel(pool, interval)
    if not posts_by_channel:
        return

    total = 0
    for channel_id, message_ids in posts_by_channel.items():
        all_updates: list[tuple[int, int, int, int, int]] = []

        for i in range(0, len(message_ids), _BATCH_SIZE):
            batch = message_ids[i : i + _BATCH_SIZE]
            stats = await fetch_message_stats(channel_id, batch)
            for msg_id, views, forwards, comments in stats:
                all_updates.append((views, forwards, comments, channel_id, msg_id))
            await asyncio.sleep(0.3)

        if all_updates:
            await queries.bulk_update_post_stats(pool, all_updates)
            total += len(all_updates)

        await asyncio.sleep(_INTER_CHANNEL)

    if total:
        logger.info("Views refreshed: %d posts (%s)", total, interval)


# ─── Member count refresh ─────────────────────────────────────────────────────

async def _update_member_counts(bot: Bot, pool: asyncpg.Pool) -> None:
    async with pool.acquire() as conn:
        channels = await conn.fetch(
            "SELECT channel_id FROM telegram_channels WHERE is_active = TRUE"
        )

    updated = 0
    for row in channels:
        try:
            count = await bot.get_chat_member_count(row["channel_id"])
            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE telegram_channels SET member_count = $1 WHERE channel_id = $2",
                    count, row["channel_id"],
                )
            await queries.upsert_member_count_snapshot(pool, row["channel_id"], count)
            updated += 1
            await asyncio.sleep(0.1)
        except Exception as e:
            logger.warning("member_count update failed for %s: %s", row["channel_id"], e)

    logger.info("Member counts updated for %d channels", updated)


# ─── Main loop ────────────────────────────────────────────────────────────────

async def run_scheduler(bot: Bot, pool: asyncpg.Pool) -> None:
    logger.info(
        "Scheduler started — fast tick: %ds, slow tick every %d iterations",
        _FAST_INTERVAL, _SLOW_EVERY_N,
    )
    tick = 0
    while True:
        await asyncio.sleep(_FAST_INTERVAL)
        tick += 1

        # Fast tick: refresh last 24 h
        try:
            await _refresh_views(pool, "24 hours")
        except Exception as e:
            logger.error("Fast-tick views refresh error: %s", e)

        # Slow tick (every 60 min): member counts + last 7 d views
        if tick % _SLOW_EVERY_N == 0:
            try:
                await _update_member_counts(bot, pool)
            except Exception as e:
                logger.error("Member count update error: %s", e)
            try:
                await _refresh_views(pool, "7 days")
            except Exception as e:
                logger.error("Slow-tick views refresh error: %s", e)
