from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from i18n import t

# Drill-down (inline) keyboards. Top-level navigation lives in the persistent
# reply keyboard (see keyboards/reply.py); these are contextual sub-menus.


def report_channels_kb(channels: list, lang: str) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for ch in channels:
        label = f"@{ch['username']}" if ch["username"] else ch["title"]
        b.button(text=f"📺  {label}", callback_data=f"report:channel:{ch['channel_id']}")
    b.adjust(1)
    return b.as_markup()


def report_period_kb(channel_id: int, lang: str) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for value in ("24h", "7d", "30d", "all"):
        b.button(text=t(lang, f"period.{value}"), callback_data=f"report:period:{channel_id}:{value}")
    b.adjust(2)
    b.button(text=t(lang, "nav.back"), callback_data="report:start")
    b.adjust(2, 2, 1)
    return b.as_markup()


def channels_kb(channels: list, lang: str) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for ch in channels:
        label = f"@{ch['username']}" if ch["username"] else ch["title"]
        b.button(text=f"📺  {label}", callback_data=f"channel:stats:{ch['channel_id']}")
    b.adjust(1)
    b.button(text=t(lang, "channels.add"), callback_data="channel:add_info")
    b.adjust(1)
    return b.as_markup()


def channel_detail_kb(channel_id: int, lang: str) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text=t(lang, "channel.remove"),    callback_data=f"channel:remove:{channel_id}")
    b.button(text=t(lang, "nav.back_channels"), callback_data="channel:list")
    b.adjust(2)
    return b.as_markup()


def back_channels_kb(lang: str) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text=t(lang, "nav.back_channels"), callback_data="channel:list")
    return b.as_markup()
