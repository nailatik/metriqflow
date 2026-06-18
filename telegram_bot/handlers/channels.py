import asyncpg
from aiogram import Router, F
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message

from config import settings
from db import queries
from i18n import t
from keyboards.inline import channels_kb, channel_detail_kb, back_channels_kb
from utils.fmt import fmt_number

router = Router()

_DIV = "─" * 30


async def _list_view(db: asyncpg.Pool, user_id: int, lang: str) -> tuple[str, InlineKeyboardMarkup]:
    channels = await queries.get_user_channels(db, user_id)
    if channels:
        lines = [f"{t(lang, 'channels.title')}  ({len(channels)})\n{_DIV}"]
        for i, ch in enumerate(channels, 1):
            name = f"@{ch['username']}" if ch["username"] else ch["title"]
            subs = f"  ·  {fmt_number(ch['member_count'])} {t(lang, 'channels.subs')}" if ch["member_count"] else ""
            lines.append(f"{i}.  {name}{subs}")
        text = "\n".join(lines)
    else:
        text = f"{t(lang, 'channels.title')}\n{_DIV}\n\n{t(lang, 'channels.empty')}"
    return text, channels_kb(channels, lang)


async def render_channels(message: Message, db: asyncpg.Pool, lang: str) -> None:
    """Top-level entry from the reply keyboard — sends a fresh message."""
    user = await queries.get_linked_user(db, message.from_user.id)
    if not user:
        await message.answer(t(lang, "not_linked"))
        return
    text, kb = await _list_view(db, user["id"], lang)
    await message.answer(text, reply_markup=kb)


@router.callback_query(F.data == "channel:list")
async def back_to_list(call: CallbackQuery, db: asyncpg.Pool, lang: str) -> None:
    user = await queries.get_linked_user(db, call.from_user.id)
    if not user:
        await call.answer(t(lang, "not_linked"), show_alert=True)
        return
    text, kb = await _list_view(db, user["id"], lang)
    await call.message.edit_text(text, reply_markup=kb)
    await call.answer()


@router.callback_query(F.data.startswith("channel:stats:"))
async def show_channel_stats(call: CallbackQuery, db: asyncpg.Pool, lang: str) -> None:
    channel_id = int(call.data.split(":")[2])
    stats = await queries.get_channel_stats(db, channel_id)
    if not stats:
        await call.answer(t(lang, "channels.not_found"), show_alert=True)
        return

    name = f"@{stats['username']}" if stats["username"] else stats["title"]
    avg = int(stats["avg_views"])
    text = (
        f"📊 <b>{name}</b>\n"
        f"{_DIV}\n"
        f"👥  {t(lang, 'channel.subs')}: <b>{fmt_number(stats['member_count'])}</b>\n"
        f"📝  {t(lang, 'channel.posts')}: <b>{stats['post_count']}</b>\n"
        f"👁  {t(lang, 'channel.views')}: <b>{fmt_number(stats['total_views'])}</b>\n"
        f"↗️  {t(lang, 'channel.avg')}: <b>{fmt_number(avg)}</b>\n"
        f"🔁  {t(lang, 'channel.forwards')}: <b>{fmt_number(stats['total_forwards'])}</b>"
    )
    await call.message.edit_text(text, reply_markup=channel_detail_kb(channel_id, lang))
    await call.answer()


@router.callback_query(F.data == "channel:add_info")
async def show_add_info(call: CallbackQuery, lang: str) -> None:
    bot_ref = f"@{settings.BOT_USERNAME}" if settings.BOT_USERNAME else "this bot"
    text = (
        f"{t(lang, 'channel.add_title')}\n"
        f"{_DIV}\n\n"
        f"{t(lang, 'channel.add_steps', bot=bot_ref)}"
    )
    await call.message.edit_text(text, reply_markup=back_channels_kb(lang))
    await call.answer()


@router.callback_query(F.data.startswith("channel:remove:"))
async def remove_channel(call: CallbackQuery, db: asyncpg.Pool, lang: str) -> None:
    channel_id = int(call.data.split(":")[2])

    user = await queries.get_linked_user(db, call.from_user.id)
    if not user:
        await call.answer(t(lang, "not_linked"), show_alert=True)
        return

    channel = await queries.get_channel_by_id(db, channel_id)
    if not channel or channel["user_id"] != user["id"]:
        await call.answer(t(lang, "channels.not_found"), show_alert=True)
        return

    await queries.deactivate_channel(db, channel_id)
    await call.answer(t(lang, "channels.removed"), show_alert=True)

    text, kb = await _list_view(db, user["id"], lang)
    await call.message.edit_text(text, reply_markup=kb)
