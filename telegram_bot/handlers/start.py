import asyncpg
from aiogram import Router
from aiogram.filters import CommandStart, CommandObject
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message

from db import queries
from keyboards.inline import main_menu_kb

router = Router()

_UNLINKED_TEXT = (
    "👋 <b>Welcome to Metriq Flow!</b>\n\n"
    "This bot is your admin panel — connect channels, track posts, view analytics.\n\n"
    "<b>To get started:</b>\n"
    "1. Open the web app → <b>Settings → Connect Telegram</b>\n"
    "2. Copy your link token\n"
    "3. Send it here\n\n"
    "<i>Or use the deep-link from the settings page directly.</i>"
)


class LinkStates(StatesGroup):
    waiting_for_token = State()


@router.message(CommandStart())
async def cmd_start(
    message: Message,
    command: CommandObject,
    state: FSMContext,
    db: asyncpg.Pool,
) -> None:
    token = command.args
    if token:
        await _try_link(message, token, db, state)
        return

    user = await queries.get_linked_user(db, message.from_user.id)
    if user:
        name = user["full_name"] or message.from_user.first_name
        await message.answer(
            f"👋 <b>Welcome back, {name}!</b>",
            reply_markup=main_menu_kb(),
        )
        await state.clear()
    else:
        await message.answer(_UNLINKED_TEXT)
        await state.set_state(LinkStates.waiting_for_token)


@router.message(LinkStates.waiting_for_token)
async def handle_token_input(
    message: Message,
    state: FSMContext,
    db: asyncpg.Pool,
) -> None:
    token = (message.text or "").strip()
    await _try_link(message, token, db, state)


async def _try_link(
    message: Message,
    token: str,
    db: asyncpg.Pool,
    state: FSMContext,
) -> None:
    tg = message.from_user
    user_id = await queries.validate_and_use_token(
        db,
        token=token,
        telegram_id=tg.id,
        username=tg.username,
        first_name=tg.first_name,
    )
    if user_id:
        await state.clear()
        await message.answer(
            "✅ <b>Account linked!</b>\n\n"
            "Your Metriq Flow account is connected to this Telegram.",
            reply_markup=main_menu_kb(),
        )
    else:
        await message.answer(
            "❌ <b>Invalid or expired token.</b>\n\n"
            "Get a fresh one from <b>Settings → Connect Telegram</b>.",
        )
