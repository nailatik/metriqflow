"""Auto-report management from the Telegram bot."""
from __future__ import annotations

import asyncpg
from aiogram import Router, F
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder

from db import queries
from i18n import t

router = Router()

_STATUS_ICON = {"delivered": "✅", "failed": "❌", "pending": "⏳", None: "—"}


def _freq_label(lang: str, days: int) -> str:
    return t(lang, f"freq.{days}") if days in (1, 7, 30) else f"{days}d"


def _schedules_kb(schedules: list, lang: str) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for s in schedules:
        icon = "✅" if s["enabled"] and not s["paused"] else ("⏸" if s["paused"] else "🔴")
        freq = _freq_label(lang, s["frequency_days"])
        b.button(
            text=f"{icon}  {s['title'][:28]}  ({freq})",
            callback_data=f"ar:detail:{s['id']}",
        )
    b.adjust(1)
    return b.as_markup()


def _detail_kb(schedule_id: int, tg_enabled: bool, schedule_enabled: bool, lang: str) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    tg_label = t(lang, "ar.tg_disable") if tg_enabled else t(lang, "ar.tg_enable")
    b.button(text=tg_label, callback_data=f"ar:tg_toggle:{schedule_id}:{int(not tg_enabled)}")
    on_off = t(lang, "ar.sched_disable") if schedule_enabled else t(lang, "ar.sched_enable")
    b.button(text=on_off, callback_data=f"ar:toggle:{schedule_id}:{int(not schedule_enabled)}")
    b.button(text=t(lang, "nav.schedules"), callback_data="ar:list")
    b.adjust(1)
    return b.as_markup()


async def _list_view(db: asyncpg.Pool, user_id: int, lang: str) -> tuple[str, InlineKeyboardMarkup | None]:
    schedules = await queries.get_user_schedules(db, user_id)
    if not schedules:
        return f"{t(lang, 'ar.title')}\n\n{t(lang, 'ar.empty')}", None
    text = (
        f"{t(lang, 'ar.title')}  ({t(lang, 'ar.count', n=len(schedules))})\n\n"
        f"{t(lang, 'ar.select')}"
    )
    return text, _schedules_kb(schedules, lang)


# ─── Top-level entry (reply keyboard) ─────────────────────────────────────────

async def render_autoreports(message: Message, db: asyncpg.Pool, lang: str) -> None:
    user = await queries.get_linked_user(db, message.from_user.id)
    if not user:
        await message.answer(t(lang, "not_linked"))
        return
    text, kb = await _list_view(db, user["id"], lang)
    await message.answer(text, reply_markup=kb)


@router.callback_query(F.data == "ar:list")
async def show_schedules(call: CallbackQuery, db: asyncpg.Pool, lang: str) -> None:
    user = await queries.get_linked_user(db, call.from_user.id)
    if not user:
        await call.answer(t(lang, "not_linked"), show_alert=True)
        return
    text, kb = await _list_view(db, user["id"], lang)
    await call.message.edit_text(text, reply_markup=kb)
    await call.answer()


# ─── Detail view ─────────────────────────────────────────────────────────────

@router.callback_query(F.data.startswith("ar:detail:"))
async def show_detail(call: CallbackQuery, db: asyncpg.Pool, lang: str) -> None:
    schedule_id = int(call.data.split(":")[2])

    user = await queries.get_linked_user(db, call.from_user.id)
    if not user:
        await call.answer(t(lang, "not_linked"), show_alert=True)
        return

    schedules = await queries.get_user_schedules(db, user["id"])
    s = next((x for x in schedules if x["id"] == schedule_id), None)
    if not s:
        await call.answer(t(lang, "ar.not_found"), show_alert=True)
        return

    freq      = _freq_label(lang, s["frequency_days"])
    status    = _STATUS_ICON.get(s["last_status"], "—")
    tg_status = t(lang, "ar.tg_on") if s["tg_enabled"] else t(lang, "ar.tg_off")
    state     = (
        t(lang, "ar.st_active") if s["enabled"] and not s["paused"]
        else (t(lang, "ar.st_paused") if s["paused"] else t(lang, "ar.st_off"))
    )
    next_dt   = s["next_send_at"].strftime("%Y-%m-%d") if s["next_send_at"] else "—"

    text = (
        f"🗓 <b>{s['title']}</b>\n\n"
        f"{t(lang, 'ar.source')}: <b>{s['source']}</b>\n"
        f"{t(lang, 'ar.format')}: <b>.{s['format'].upper()}</b>\n"
        f"{t(lang, 'ar.frequency')}: <b>{freq}</b>\n"
        f"{t(lang, 'ar.state')}: {state}\n"
        f"{t(lang, 'ar.tg_delivery')}: {tg_status}\n"
        f"{t(lang, 'ar.next')}: <b>{next_dt}</b>\n"
        f"{t(lang, 'ar.last')}: {status}"
    )

    await call.message.edit_text(
        text,
        reply_markup=_detail_kb(schedule_id, bool(s["tg_enabled"]), bool(s["enabled"]), lang),
    )
    await call.answer()


# ─── Toggle TG delivery ───────────────────────────────────────────────────────

@router.callback_query(F.data.startswith("ar:tg_toggle:"))
async def tg_toggle(call: CallbackQuery, db: asyncpg.Pool, lang: str) -> None:
    parts     = call.data.split(":")
    sched_id  = int(parts[2])
    new_state = bool(int(parts[3]))

    user = await queries.get_linked_user(db, call.from_user.id)
    if not user:
        await call.answer(t(lang, "not_linked"), show_alert=True)
        return

    ok = await queries.toggle_schedule_telegram(db, sched_id, user["id"], new_state)
    if not ok:
        await call.answer(t(lang, "ar.not_found"), show_alert=True)
        return

    await call.answer(t(lang, "ar.tg_toggled_on" if new_state else "ar.tg_toggled_off"))
    call.data = f"ar:detail:{sched_id}"
    await show_detail(call, db, lang)


# ─── Toggle schedule on/off ───────────────────────────────────────────────────

@router.callback_query(F.data.startswith("ar:toggle:"))
async def schedule_toggle(call: CallbackQuery, db: asyncpg.Pool, lang: str) -> None:
    parts     = call.data.split(":")
    sched_id  = int(parts[2])
    new_state = bool(int(parts[3]))

    user = await queries.get_linked_user(db, call.from_user.id)
    if not user:
        await call.answer(t(lang, "not_linked"), show_alert=True)
        return

    ok = await queries.toggle_schedule_enabled(db, sched_id, user["id"], new_state)
    if not ok:
        await call.answer(t(lang, "ar.not_found"), show_alert=True)
        return

    await call.answer(t(lang, "ar.updated"))
    call.data = f"ar:detail:{sched_id}"
    await show_detail(call, db, lang)
