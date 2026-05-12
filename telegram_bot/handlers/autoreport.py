"""Auto-report management from the Telegram bot."""
from __future__ import annotations

import asyncpg
from aiogram import Router, F
from aiogram.types import CallbackQuery
from aiogram.utils.keyboard import InlineKeyboardBuilder

from db import queries

router = Router()

_FREQ_LABEL = {1: "Daily", 7: "Weekly", 30: "Monthly"}
_STATUS_ICON = {
    "delivered": "✅",
    "failed":    "❌",
    "pending":   "⏳",
    None:        "—",
}


def _schedules_kb(schedules: list) -> object:
    b = InlineKeyboardBuilder()
    for s in schedules:
        icon = "✅" if s["enabled"] and not s["paused"] else ("⏸" if s["paused"] else "🔴")
        freq = _FREQ_LABEL.get(s["frequency_days"], f"{s['frequency_days']}d")
        b.button(
            text=f"{icon}  {s['title'][:28]}  ({freq})",
            callback_data=f"ar:detail:{s['id']}",
        )
    b.adjust(1)
    b.button(text="← Main menu", callback_data="menu:main")
    b.adjust(1)
    return b.as_markup()


def _detail_kb(schedule_id: int, tg_enabled: bool, schedule_enabled: bool) -> object:
    b = InlineKeyboardBuilder()
    tg_label = "🔕 Disable TG delivery" if tg_enabled else "🔔 Enable TG delivery"
    b.button(text=tg_label,       callback_data=f"ar:tg_toggle:{schedule_id}:{int(not tg_enabled)}")
    on_off   = "🔴 Disable schedule" if schedule_enabled else "✅ Enable schedule"
    b.button(text=on_off,         callback_data=f"ar:toggle:{schedule_id}:{int(not schedule_enabled)}")
    b.button(text="← Schedules", callback_data="ar:list")
    b.adjust(1)
    return b.as_markup()


# ─── List schedules ───────────────────────────────────────────────────────────

@router.callback_query(F.data == "ar:list")
async def show_schedules(call: CallbackQuery, db: asyncpg.Pool) -> None:
    user = await queries.get_linked_user(db, call.from_user.id)
    if not user:
        await call.answer("Account not linked. Use /start.", show_alert=True)
        return

    schedules = await queries.get_user_schedules(db, user["id"])
    if not schedules:
        await call.message.edit_text(
            "🗓 <b>Auto-reports</b>\n\nNo schedules yet.\nCreate them at metriqflow.app/reports",
            reply_markup=_back_kb(),
        )
        await call.answer()
        return

    await call.message.edit_text(
        f"🗓 <b>Auto-reports</b>  ({len(schedules)} schedules)\n\nSelect to manage:",
        reply_markup=_schedules_kb(schedules),
    )
    await call.answer()


# ─── Detail view ─────────────────────────────────────────────────────────────

@router.callback_query(F.data.startswith("ar:detail:"))
async def show_detail(call: CallbackQuery, db: asyncpg.Pool) -> None:
    schedule_id = int(call.data.split(":")[2])

    user = await queries.get_linked_user(db, call.from_user.id)
    if not user:
        await call.answer("Not linked.", show_alert=True)
        return

    schedules = await queries.get_user_schedules(db, user["id"])
    s = next((x for x in schedules if x["id"] == schedule_id), None)
    if not s:
        await call.answer("Schedule not found.", show_alert=True)
        return

    freq      = _FREQ_LABEL.get(s["frequency_days"], f"{s['frequency_days']}d")
    status    = _STATUS_ICON.get(s["last_status"], "—")
    tg_status = "✅ ON" if s["tg_enabled"] else "🔕 OFF"
    state     = "🟢 Active" if s["enabled"] and not s["paused"] else ("⏸ Paused" if s["paused"] else "🔴 Off")
    next_dt   = s["next_send_at"].strftime("%Y-%m-%d") if s["next_send_at"] else "—"

    text = (
        f"🗓 <b>{s['title']}</b>\n\n"
        f"Source:    <b>{s['source']}</b>\n"
        f"Format:    <b>.{s['format'].upper()}</b>\n"
        f"Frequency: <b>{freq}</b>\n"
        f"State:     {state}\n"
        f"TG delivery: {tg_status}\n"
        f"Next send: <b>{next_dt}</b>\n"
        f"Last:      {status}"
    )

    await call.message.edit_text(
        text,
        reply_markup=_detail_kb(schedule_id, bool(s["tg_enabled"]), bool(s["enabled"])),
    )
    await call.answer()


# ─── Toggle TG delivery ───────────────────────────────────────────────────────

@router.callback_query(F.data.startswith("ar:tg_toggle:"))
async def tg_toggle(call: CallbackQuery, db: asyncpg.Pool) -> None:
    parts      = call.data.split(":")
    sched_id   = int(parts[2])
    new_state  = bool(int(parts[3]))

    user = await queries.get_linked_user(db, call.from_user.id)
    if not user:
        await call.answer("Not linked.", show_alert=True)
        return

    ok = await queries.toggle_schedule_telegram(db, sched_id, user["id"], new_state)
    if not ok:
        await call.answer("Schedule not found.", show_alert=True)
        return

    state_word = "enabled" if new_state else "disabled"
    await call.answer(f"Telegram delivery {state_word}.")
    # Refresh detail view
    call.data = f"ar:detail:{sched_id}"
    await show_detail(call, db)


# ─── Toggle schedule on/off ───────────────────────────────────────────────────

@router.callback_query(F.data.startswith("ar:toggle:"))
async def schedule_toggle(call: CallbackQuery, db: asyncpg.Pool) -> None:
    parts     = call.data.split(":")
    sched_id  = int(parts[2])
    new_state = bool(int(parts[3]))

    user = await queries.get_linked_user(db, call.from_user.id)
    if not user:
        await call.answer("Not linked.", show_alert=True)
        return

    ok = await queries.toggle_schedule_enabled(db, sched_id, user["id"], new_state)
    if not ok:
        await call.answer("Schedule not found.", show_alert=True)
        return

    await call.answer("Updated.")
    call.data = f"ar:detail:{sched_id}"
    await show_detail(call, db)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _back_kb() -> object:
    b = InlineKeyboardBuilder()
    b.button(text="← Main menu", callback_data="menu:main")
    return b.as_markup()
