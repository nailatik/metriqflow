"""Injects the user's language into every handler as data["lang"], and
data["lang_set"] (True if the user has an explicit stored choice).

Resolution order: stored pref → Telegram client language_code (ru→ru, else en)
→ DEFAULT_LANG. The client-language guess is a fallback only; it is NOT persisted,
so the /start picker still fires for first-time users.
"""
from typing import Any, Awaitable, Callable

import asyncpg
from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, User

from db import queries
from i18n import DEFAULT_LANG, SUPPORTED


class LangMiddleware(BaseMiddleware):
    def __init__(self, pool: asyncpg.Pool) -> None:
        self.pool = pool

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        user: User | None = data.get("event_from_user")
        lang = DEFAULT_LANG
        lang_set = False

        if user is not None:
            stored = await queries.get_language(self.pool, user.id)
            if stored in SUPPORTED:
                lang, lang_set = stored, True
            elif user.language_code:
                code = user.language_code.split("-")[0]
                lang = code if code in SUPPORTED else "en"

        data["lang"] = lang
        data["lang_set"] = lang_set
        return await handler(event, data)
