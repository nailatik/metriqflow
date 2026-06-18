import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.client.telegram import TelegramAPIServer
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage

from config import settings
from db.pool import create_pool, close_pool
from handlers import channel_events, start, menu, account, channels, report, autoreport
from middlewares.db import DatabaseMiddleware
from scheduler import run_scheduler
from telethon_client import close_client as close_telethon

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


class _RelaySession(AiohttpSession):
    """AiohttpSession that routes the Bot API through a relay and sends a plain
    User-Agent. The relay's Cloudflare zone runs Bot Fight Mode that 403s
    library UAs (it blocks "Anthropic/JS" the same way), so override it."""

    async def create_session(self):
        session = await super().create_session()
        session.headers["User-Agent"] = "metriqflow-bot"
        return session


def _build_session() -> AiohttpSession | None:
    base = settings.TELEGRAM_API_BASE.rstrip("/")
    if not base:
        return None  # direct api.telegram.org (aiogram default)
    api = TelegramAPIServer.from_base(base)
    logger.info("Bot API via relay: %s", base)
    return _RelaySession(api=api)


async def main() -> None:
    bot = Bot(
        token=settings.BOT_TOKEN,
        session=_build_session(),
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher(storage=MemoryStorage())

    pool = await create_pool()
    dp.update.middleware(DatabaseMiddleware(pool))

    # channel_events first — catches channel updates before other routers
    dp.include_router(channel_events.router)
    dp.include_router(start.router)
    dp.include_router(menu.router)
    dp.include_router(account.router)
    dp.include_router(channels.router)
    dp.include_router(report.router)
    dp.include_router(autoreport.router)

    me = await bot.get_me()
    logger.info("Starting @%s (id=%s)", me.username, me.id)

    asyncio.create_task(run_scheduler(bot, pool))

    try:
        await dp.start_polling(
            bot,
            allowed_updates=dp.resolve_used_update_types(),
        )
    finally:
        await close_telethon()
        await close_pool()
        await bot.session.close()
        logger.info("Bot stopped")


if __name__ == "__main__":
    asyncio.run(main())
