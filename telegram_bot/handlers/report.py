from __future__ import annotations

import csv
import io
from datetime import datetime, timezone

import asyncpg
from aiogram import Bot, Router, F
from aiogram.types import BufferedInputFile, CallbackQuery, Message

from db import queries
from i18n import t
from keyboards.inline import report_channels_kb, report_period_kb
from utils.fmt import fmt_number

router = Router()


def _period_label(lang: str, period: str) -> str:
    return t(lang, f"period.{period}")


async def render_report(message: Message, db: asyncpg.Pool, lang: str) -> None:
    """Top-level entry from the reply keyboard — channel picker (fresh message)."""
    user = await queries.get_linked_user(db, message.from_user.id)
    if not user:
        await message.answer(t(lang, "not_linked"))
        return
    channels = await queries.get_user_channels(db, user["id"])
    if not channels:
        await message.answer(t(lang, "report.no_channels"))
        return
    await message.answer(
        f"{t(lang, 'report.title')}\n\n{t(lang, 'report.pick_channel')}",
        reply_markup=report_channels_kb(channels, lang),
    )


@router.callback_query(F.data == "report:start")
async def report_start(call: CallbackQuery, db: asyncpg.Pool, lang: str) -> None:
    user = await queries.get_linked_user(db, call.from_user.id)
    if not user:
        await call.answer(t(lang, "not_linked"), show_alert=True)
        return
    channels = await queries.get_user_channels(db, user["id"])
    if not channels:
        await call.answer(t(lang, "report.no_channels"), show_alert=True)
        return
    await call.message.edit_text(
        f"{t(lang, 'report.title')}\n\n{t(lang, 'report.pick_channel')}",
        reply_markup=report_channels_kb(channels, lang),
    )
    await call.answer()


@router.callback_query(F.data.startswith("report:channel:"))
async def report_pick_period(call: CallbackQuery, lang: str) -> None:
    channel_id = int(call.data.split(":")[2])
    await call.message.edit_text(
        f"{t(lang, 'report.title')}\n\n{t(lang, 'report.pick_period')}",
        reply_markup=report_period_kb(channel_id, lang),
    )
    await call.answer()


@router.callback_query(F.data.startswith("report:period:"))
async def report_generate(call: CallbackQuery, db: asyncpg.Pool, bot: Bot, lang: str) -> None:
    parts = call.data.split(":")
    channel_id = int(parts[2])
    period = parts[3]

    user = await queries.get_linked_user(db, call.from_user.id)
    if not user:
        await call.answer(t(lang, "not_linked"), show_alert=True)
        return

    channel_row = await queries.get_channel_by_id(db, channel_id)
    if not channel_row or channel_row["user_id"] != user["id"]:
        await call.answer(t(lang, "channels.not_found"), show_alert=True)
        return

    await call.answer(t(lang, "report.generating_short"))
    await call.message.edit_text(t(lang, "report.generating"))

    posts = await queries.get_posts_for_report(db, channel_id, period)

    if not posts:
        await call.message.edit_text(
            t(lang, "report.empty", period=_period_label(lang, period)),
            reply_markup=report_period_kb(channel_id, lang),
        )
        return

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["date", "message_id", "views", "reactions", "forwards", "engagement_rate_%", "has_media", "text_preview"])

    for p in posts:
        posted = p["posted_at"]
        date_str = posted.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M") if posted else ""
        writer.writerow([
            date_str,
            p["message_id"],
            p["views"],
            p["reactions_total"],
            p["forwards"],
            p["engagement_rate"],
            "yes" if p["has_media"] else "no",
            (p["text_preview"] or "").replace("\n", " "),
        ])

    buf.seek(0)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M")
    filename = f"report_{channel_id}_{period}_{ts}.csv"

    total_views = sum(p["views"] or 0 for p in posts)
    avg_er = sum(float(p["engagement_rate"] or 0) for p in posts) / len(posts)

    caption = (
        f"{t(lang, 'report.ready', period=_period_label(lang, period))}\n"
        f"{t(lang, 'report.summary', posts=len(posts), views=fmt_number(total_views), er=f'{avg_er:.1f}')}"
    )

    await bot.send_document(
        chat_id=call.from_user.id,
        document=BufferedInputFile(buf.getvalue().encode("utf-8"), filename=filename),
        caption=caption,
    )

    await call.message.edit_text(
        t(lang, "report.sent"),
        reply_markup=report_period_kb(channel_id, lang),
    )
