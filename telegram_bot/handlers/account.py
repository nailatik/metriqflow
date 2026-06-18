import asyncpg
from aiogram.types import Message

from db import queries
from i18n import t
from utils.fmt import fmt_date, fmt_number

_DIV = "─" * 30


async def render_account(message: Message, db: asyncpg.Pool, lang: str) -> None:
    """Account overview. Top-level section — entered from the reply keyboard,
    so it sends a fresh message (no inline keyboard needed)."""
    user = await queries.get_linked_user(db, message.from_user.id)
    if not user:
        await message.answer(t(lang, "not_linked"))
        return

    text = (
        f"{t(lang, 'account.title')}\n"
        f"{_DIV}\n"
        f"<b>{t(lang, 'account.name')}:</b> {user['full_name'] or '—'}\n"
        f"<b>{t(lang, 'account.email')}:</b> {user['email']}\n"
        f"<b>{t(lang, 'account.org')}:</b> {user['organization'] or '—'}\n"
        f"<b>{t(lang, 'account.phone')}:</b> {user['phone'] or '—'}\n"
        f"\n"
        f"<b>{t(lang, 'account.since')}:</b> {fmt_date(user['created_at'])}\n"
        f"{_DIV}\n"
        f"📺  {t(lang, 'account.channels')}: <b>{user['channel_count']}</b>\n"
        f"📝  {t(lang, 'account.posts')}: <b>{fmt_number(user['post_count'])}</b>"
    )
    await message.answer(text)
