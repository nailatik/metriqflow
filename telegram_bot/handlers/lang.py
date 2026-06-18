import asyncpg
from aiogram import Router, F
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery

from db import queries
from i18n import t, SUPPORTED
from handlers.start import proceed_start

router = Router()


@router.callback_query(F.data.startswith("lang:set:"))
async def set_lang(
    call: CallbackQuery,
    db: asyncpg.Pool,
    state: FSMContext,
) -> None:
    code = call.data.split(":")[2]
    if code not in SUPPORTED:
        await call.answer()
        return

    await queries.set_language(db, call.from_user.id, code)
    await call.message.edit_text(t(code, "lang.saved"))
    await call.answer()
    # Continue the onboarding flow (or refresh the menu) in the new language.
    await proceed_start(call.message, call.from_user, code, db, state)
