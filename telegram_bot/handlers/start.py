import asyncpg
from aiogram import Router
from aiogram.filters import Command, CommandStart, CommandObject
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message, User

from db import queries
from i18n import t
from keyboards.reply import main_reply_kb, lang_choice_kb

router = Router()


@router.message(Command("menu"))
async def cmd_menu(message: Message, state: FSMContext, db: asyncpg.Pool, lang: str) -> None:
    await proceed_start(message, message.from_user, lang, db, state)


@router.message(Command("language"))
async def cmd_language(message: Message, lang: str) -> None:
    await message.answer(t(lang, "lang.choose"), reply_markup=lang_choice_kb())


class LinkStates(StatesGroup):
    waiting_for_token = State()


@router.message(CommandStart())
async def cmd_start(
    message: Message,
    command: CommandObject,
    state: FSMContext,
    db: asyncpg.Pool,
    lang: str,
    lang_set: bool,
) -> None:
    token = command.args
    if token:
        await _try_link(message, token, db, state, lang)
        return

    # First-time user with no stored language → ask first, then continue.
    if not lang_set:
        await state.set_state(None)
        await message.answer(t(lang, "lang.choose"), reply_markup=lang_choice_kb())
        return

    await proceed_start(message, message.from_user, lang, db, state)


async def proceed_start(
    target: Message,
    user: User,
    lang: str,
    db: asyncpg.Pool,
    state: FSMContext,
) -> None:
    """Show welcome (linked) or linking instructions (unlinked). `target` is the
    Message to reply on (works for both /start and the language callback)."""
    linked = await queries.get_linked_user(db, user.id)
    if linked:
        await state.clear()
        name = linked["full_name"] or user.first_name
        await target.answer(
            t(lang, "start.welcome_back", name=name),
            reply_markup=main_reply_kb(lang),
        )
    else:
        await target.answer(t(lang, "start.unlinked"))
        await state.set_state(LinkStates.waiting_for_token)


@router.message(LinkStates.waiting_for_token)
async def handle_token_input(
    message: Message,
    state: FSMContext,
    db: asyncpg.Pool,
    lang: str,
) -> None:
    token = (message.text or "").strip()
    await _try_link(message, token, db, state, lang)


async def _try_link(
    message: Message,
    token: str,
    db: asyncpg.Pool,
    state: FSMContext,
    lang: str,
) -> None:
    tg = message.from_user
    result = await queries.validate_and_use_token(
        db,
        token=token,
        telegram_id=tg.id,
        username=tg.username,
        first_name=tg.first_name,
    )

    if isinstance(result, int):
        await state.clear()
        await message.answer(t(lang, "link.ok"), reply_markup=main_reply_kb(lang))
    elif result == "telegram_taken":
        await message.answer(t(lang, "link.telegram_taken"))
    elif result == "user_taken":
        await message.answer(t(lang, "link.user_taken"))
    else:
        await message.answer(t(lang, "link.invalid"))
