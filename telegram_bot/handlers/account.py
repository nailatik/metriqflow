import asyncpg
from aiogram import Router, F
from aiogram.types import CallbackQuery

from db import queries
from keyboards.inline import back_main_kb
from utils.fmt import fmt_date, fmt_number

router = Router()

_DIV = "─" * 30


@router.callback_query(F.data == "menu:account")
async def show_account(call: CallbackQuery, db: asyncpg.Pool) -> None:
    user = await queries.get_linked_user(db, call.from_user.id)
    if not user:
        await call.answer("Account not linked. Use /start to link.", show_alert=True)
        return

    text = (
        f"👤 <b>Account</b>\n"
        f"{_DIV}\n"
        f"<b>Name</b>         {user['full_name'] or '—'}\n"
        f"<b>Email</b>        {user['email']}\n"
        f"<b>Organization</b> {user['organization'] or '—'}\n"
        f"<b>Phone</b>        {user['phone'] or '—'}\n"
        f"\n"
        f"<b>Member since</b> {fmt_date(user['created_at'])}\n"
        f"{_DIV}\n"
        f"📺  Channels connected  <b>{user['channel_count']}</b>\n"
        f"📝  Posts collected      <b>{fmt_number(user['post_count'])}</b>"
    )

    await call.message.edit_text(text, reply_markup=back_main_kb())
    await call.answer()
