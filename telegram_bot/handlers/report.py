from __future__ import annotations

import csv
import io
from datetime import datetime, timezone

import asyncpg
from aiogram import Bot, Router, F
from aiogram.types import BufferedInputFile, CallbackQuery

from db import queries
from keyboards.inline import report_channels_kb, report_period_kb
from utils.fmt import fmt_number

router = Router()

_PERIOD_LABELS = {
    "24h": "Last 24 h",
    "7d":  "Last 7 days",
    "30d": "Last 30 days",
    "all": "All time",
}


@router.callback_query(F.data == "report:start")
async def report_start(call: CallbackQuery, db: asyncpg.Pool) -> None:
    user = await queries.get_linked_user(db, call.from_user.id)
    if not user:
        await call.answer("Account not linked. Use /start to link.", show_alert=True)
        return

    channels = await queries.get_user_channels(db, user["id"])
    if not channels:
        await call.answer("No channels yet. Add bot as admin to a channel first.", show_alert=True)
        return

    await call.message.edit_text(
        "📊 <b>Report</b>\n\nSelect channel:",
        reply_markup=report_channels_kb(channels),
    )
    await call.answer()


@router.callback_query(F.data.startswith("report:channel:"))
async def report_pick_period(call: CallbackQuery) -> None:
    channel_id = int(call.data.split(":")[2])
    await call.message.edit_text(
        "📊 <b>Report</b>\n\nSelect period:",
        reply_markup=report_period_kb(channel_id),
    )
    await call.answer()


@router.callback_query(F.data.startswith("report:period:"))
async def report_generate(call: CallbackQuery, db: asyncpg.Pool, bot: Bot) -> None:
    parts = call.data.split(":")
    channel_id = int(parts[2])
    period = parts[3]

    user = await queries.get_linked_user(db, call.from_user.id)
    if not user:
        await call.answer("Account not linked.", show_alert=True)
        return

    channel_row = await queries.get_channel_by_id(db, channel_id)
    if not channel_row or channel_row["user_id"] != user["id"]:
        await call.answer("Channel not found.", show_alert=True)
        return

    await call.answer("Generating report…")
    await call.message.edit_text("⏳ Generating CSV report…")

    posts = await queries.get_posts_for_report(db, channel_id, period)

    if not posts:
        await call.message.edit_text(
            f"No posts found for <b>{_PERIOD_LABELS.get(period, period)}</b>.",
            reply_markup=report_period_kb(channel_id),
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
        f"📊 <b>Report ready</b>  ·  {_PERIOD_LABELS.get(period, period)}\n"
        f"Posts: <b>{len(posts)}</b>  ·  "
        f"Total views: <b>{fmt_number(total_views)}</b>  ·  "
        f"Avg ER: <b>{avg_er:.1f}%</b>"
    )

    await bot.send_document(
        chat_id=call.from_user.id,
        document=BufferedInputFile(buf.getvalue().encode("utf-8"), filename=filename),
        caption=caption,
    )

    await call.message.edit_text(
        "✅ Report sent above.\n\nGenerate another?",
        reply_markup=report_period_kb(channel_id),
    )
