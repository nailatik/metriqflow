import asyncpg
from aiogram import Router, F
from aiogram.types import CallbackQuery

from db import queries
from keyboards.inline import main_menu_kb

router = Router()


@router.callback_query(F.data == "menu:main")
async def show_main_menu(call: CallbackQuery, db: asyncpg.Pool) -> None:
    user = await queries.get_linked_user(db, call.from_user.id)
    if not user:
        await call.answer("Account not linked. Use /start to link.", show_alert=True)
        return

    name = user["full_name"] or call.from_user.first_name
    await call.message.edit_text(
        f"👋 <b>Welcome back, {name}!</b>\n\n"
        f"Use the menu below to navigate.",
        reply_markup=main_menu_kb(),
    )
    await call.answer()
