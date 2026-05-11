"""
Handles channel-level events:
  1. my_chat_member            — bot added/removed as admin in a channel
  2. channel_post              — new post published in a tracked channel
  3. message_reaction_count    — aggregate reaction counts updated (Bot API 7.0)
"""
import logging

import asyncpg
from aiogram import Router, F
from aiogram.types import ChatMemberUpdated, Message, MessageReactionCountUpdated

from db import queries

router = Router()
logger = logging.getLogger(__name__)


@router.my_chat_member(F.chat.type == "channel")
async def bot_status_in_channel(update: ChatMemberUpdated, db: asyncpg.Pool) -> None:
    new_status = update.new_chat_member.status
    channel    = update.chat
    added_by   = update.from_user

    if new_status == "administrator":
        linked = await queries.get_linked_user(db, added_by.id)
        if not linked:
            logger.warning(
                "Bot added to channel %s (%s) by unlinked Telegram user %s — ignoring",
                channel.id, channel.title, added_by.id,
            )
            return

        await queries.upsert_channel(
            db,
            user_id=linked["id"],
            channel_id=channel.id,
            title=channel.title or "",
            username=channel.username,
            member_count=None,
        )
        logger.info("Channel %s linked to user_id=%s", channel.id, linked["id"])

    elif new_status in ("kicked", "left", "restricted"):
        await queries.deactivate_channel(db, channel.id)
        logger.info("Channel %s deactivated (bot status: %s)", channel.id, new_status)


@router.channel_post()
async def handle_channel_post(message: Message, db: asyncpg.Pool) -> None:
    channel_id = message.chat.id

    channel = await queries.get_channel_by_id(db, channel_id)
    if not channel:
        return

    views    = getattr(message, "views",    None) or 0
    forwards = getattr(message, "forwards", None) or 0

    reactions_total = 0
    raw_reactions = getattr(message, "reactions", None)
    if raw_reactions:
        reactions_total = sum(r.total_count for r in raw_reactions.reactions)

    has_media = bool(
        message.photo or message.video or message.document
        or message.audio or message.voice or message.animation
    )

    text = message.text or message.caption
    await queries.upsert_post(
        db,
        channel_id=channel_id,
        message_id=message.message_id,
        text=text[:4096] if text else None,
        views=views,
        forwards=forwards,
        reactions_total=reactions_total,
        has_media=has_media,
        posted_at=message.date,
    )
    logger.debug("Post collected: channel=%s msg=%s views=%s", channel_id, message.message_id, views)


@router.message_reaction_count()
async def handle_reaction_count(update: MessageReactionCountUpdated, db: asyncpg.Pool) -> None:
    channel_id = update.chat.id
    channel = await queries.get_channel_by_id(db, channel_id)
    if not channel:
        return

    total = sum(r.total_count for r in update.reactions)
    async with db.acquire() as conn:
        await conn.execute(
            """
            UPDATE telegram_posts
            SET reactions_total = $1, collected_at = NOW()
            WHERE channel_id = $2 AND message_id = $3
            """,
            total, channel_id, update.message_id,
        )
    logger.debug("Reactions updated: channel=%s msg=%s total=%s", channel_id, update.message_id, total)
