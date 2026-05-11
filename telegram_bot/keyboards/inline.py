from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder


def main_menu_kb() -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text="👤  Account",  callback_data="menu:account")
    b.button(text="📺  Channels", callback_data="menu:channels")
    b.adjust(2)
    return b.as_markup()


def back_main_kb() -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text="← Main menu", callback_data="menu:main")
    return b.as_markup()


def channels_kb(channels: list) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    for ch in channels:
        label = f"@{ch['username']}" if ch["username"] else ch["title"]
        b.button(text=f"📺  {label}", callback_data=f"channel:stats:{ch['channel_id']}")
    b.adjust(1)
    b.button(text="➕  Add channel", callback_data="channel:add_info")
    b.button(text="← Main menu",    callback_data="menu:main")
    b.adjust(1)
    return b.as_markup()


def channel_detail_kb(channel_id: int) -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text="🗑  Remove",     callback_data=f"channel:remove:{channel_id}")
    b.button(text="← Channels",    callback_data="menu:channels")
    b.adjust(2)
    return b.as_markup()


def back_channels_kb() -> InlineKeyboardMarkup:
    b = InlineKeyboardBuilder()
    b.button(text="← Channels", callback_data="menu:channels")
    return b.as_markup()
