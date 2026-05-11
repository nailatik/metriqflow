"""
Telethon MTProto client — runs alongside aiogram using the SAME bot token.
Used only for reading channel message stats (views, forwards) which Bot API doesn't expose.
Session file: bot_session.session (auto-created on first start).
"""
from __future__ import annotations

import logging

from telethon import TelegramClient
from telethon.errors import (
    ChannelPrivateError,
    ChatAdminRequiredError,
    FloodWaitError,
)

from config import settings

logger = logging.getLogger(__name__)

_client: TelegramClient | None = None


async def get_client() -> TelegramClient | None:
    """Return connected Telethon client, or None if API credentials are missing."""
    global _client
    if not settings.TELEGRAM_API_ID or not settings.TELEGRAM_API_HASH:
        return None

    if _client is None:
        _client = TelegramClient(
            "bot_session",
            settings.TELEGRAM_API_ID,
            settings.TELEGRAM_API_HASH,
        )

    if not _client.is_connected():
        await _client.start(bot_token=settings.BOT_TOKEN)
        logger.info("Telethon MTProto client connected")

    return _client


async def close_client() -> None:
    global _client
    if _client and _client.is_connected():
        await _client.disconnect()
        logger.info("Telethon client disconnected")
    _client = None


async def fetch_message_stats(
    channel_id: int,
    message_ids: list[int],
) -> list[tuple[int, int, int]]:
    """
    Fetch (message_id, views, forwards) for given message IDs via MTProto.
    Returns empty list if client unavailable or channel inaccessible.
    """
    client = await get_client()
    if client is None:
        return []

    results: list[tuple[int, int, int]] = []
    try:
        messages = await client.get_messages(channel_id, ids=message_ids)
        for msg in messages:
            if msg is None:
                continue
            views    = getattr(msg, "views",    None) or 0
            forwards = getattr(msg, "forwards", None) or 0
            results.append((msg.id, views, forwards))
    except FloodWaitError as e:
        logger.warning("Telethon FloodWait for channel %s: wait %ds", channel_id, e.seconds)
    except (ChannelPrivateError, ChatAdminRequiredError):
        logger.warning("No access to channel %s — skipping", channel_id)
    except Exception as e:
        logger.error("fetch_message_stats error for channel %s: %s", channel_id, e)

    return results
