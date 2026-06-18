"""Routes taps on the persistent reply keyboard (bottom) to the right section.

Reply-keyboard buttons arrive as plain text messages; menu_action() maps the
localized label back to a logical key so this works in any language.
"""
import asyncpg
from aiogram import Router, F
from aiogram.types import Message

from i18n import menu_action, t
from keyboards.reply import lang_choice_kb
from handlers.account import render_account
from handlers.channels import render_channels
from handlers.report import render_report
from handlers.autoreport import render_autoreports

router = Router()


@router.message(F.text)
async def reply_menu(message: Message, db: asyncpg.Pool, lang: str) -> None:
    action = menu_action(message.text)
    if action is None:
        return  # not a menu button — ignore free text

    if action == "btn.account":
        await render_account(message, db, lang)
    elif action == "btn.channels":
        await render_channels(message, db, lang)
    elif action == "btn.report":
        await render_report(message, db, lang)
    elif action == "btn.autoreports":
        await render_autoreports(message, db, lang)
    elif action == "btn.language":
        await message.answer(t(lang, "lang.choose"), reply_markup=lang_choice_kb())
