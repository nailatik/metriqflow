import asyncpg
from aiogram import Router, F
from aiogram.types import CallbackQuery

from config import settings
from db import queries
from keyboards.inline import channels_kb, channel_detail_kb, back_channels_kb
from utils.fmt import fmt_number

router = Router()

_DIV = "─" * 30


@router.callback_query(F.data == "menu:channels")
async def show_channels(call: CallbackQuery, db: asyncpg.Pool) -> None:
    user = await queries.get_linked_user(db, call.from_user.id)
    if not user:
        await call.answer("Account not linked. Use /start to link.", show_alert=True)
        return

    channels = await queries.get_user_channels(db, user["id"])

    if channels:
        lines = [f"📺 <b>Channels</b>  ({len(channels)})\n{_DIV}"]
        for i, ch in enumerate(channels, 1):
            name = f"@{ch['username']}" if ch["username"] else ch["title"]
            subs = f"  ·  {fmt_number(ch['member_count'])} subs" if ch["member_count"] else ""
            lines.append(f"{i}.  {name}{subs}")
        text = "\n".join(lines)
    else:
        text = (
            f"📺 <b>Channels</b>\n{_DIV}\n\n"
            "No channels yet.\n"
            "Add this bot as admin to your channel and it will appear here."
        )

    await call.message.edit_text(text, reply_markup=channels_kb(channels))
    await call.answer()


@router.callback_query(F.data.startswith("channel:stats:"))
async def show_channel_stats(call: CallbackQuery, db: asyncpg.Pool) -> None:
    channel_id = int(call.data.split(":")[2])
    stats = await queries.get_channel_stats(db, channel_id)

    if not stats:
        await call.answer("Channel not found.", show_alert=True)
        return

    name = f"@{stats['username']}" if stats["username"] else stats["title"]
    avg = int(stats["avg_views"])

    text = (
        f"📊 <b>{name}</b>\n"
        f"{_DIV}\n"
        f"👥  Subscribers    <b>{fmt_number(stats['member_count'])}</b>\n"
        f"📝  Posts collected <b>{stats['post_count']}</b>\n"
        f"👁  Total views    <b>{fmt_number(stats['total_views'])}</b>\n"
        f"↗️  Avg views/post  <b>{fmt_number(avg)}</b>\n"
        f"🔁  Total forwards <b>{fmt_number(stats['total_forwards'])}</b>"
    )

    await call.message.edit_text(text, reply_markup=channel_detail_kb(channel_id))
    await call.answer()


@router.callback_query(F.data == "channel:add_info")
async def show_add_info(call: CallbackQuery) -> None:
    bot_ref = f"@{settings.BOT_USERNAME}" if settings.BOT_USERNAME else "this bot"
    text = (
        f"➕ <b>How to add a channel</b>\n"
        f"{_DIV}\n\n"
        f"1. Open your channel → <b>Manage Channel</b>\n"
        f"2. Go to <b>Administrators → Add Admin</b>\n"
        f"3. Search for <b>{bot_ref}</b> and add\n"
        f"4. Grant <b>Post Messages</b> permission\n"
        f"5. The channel appears here automatically\n\n"
        f"<i>The bot only reads post stats — it cannot post on your behalf.</i>"
    )
    await call.message.edit_text(text, reply_markup=back_channels_kb())
    await call.answer()


@router.callback_query(F.data.startswith("channel:remove:"))
async def remove_channel(call: CallbackQuery, db: asyncpg.Pool) -> None:
    channel_id = int(call.data.split(":")[2])

    user = await queries.get_linked_user(db, call.from_user.id)
    if not user:
        await call.answer("Account not linked.", show_alert=True)
        return

    channel = await queries.get_channel_by_id(db, channel_id)
    if not channel or channel["user_id"] != user["id"]:
        await call.answer("Channel not found.", show_alert=True)
        return

    await queries.deactivate_channel(db, channel_id)
    await call.answer("✅ Channel removed", show_alert=True)

    channels = await queries.get_user_channels(db, user["id"])
    text = (
        f"📺 <b>Channels</b>  ({len(channels)})\n{_DIV}"
        if channels
        else f"📺 <b>Channels</b>\n{_DIV}\n\nNo channels yet."
    )
    await call.message.edit_text(text, reply_markup=channels_kb(channels))
