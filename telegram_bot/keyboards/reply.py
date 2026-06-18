from aiogram.types import ReplyKeyboardMarkup
from aiogram.utils.keyboard import ReplyKeyboardBuilder, InlineKeyboardBuilder

from i18n import t, LANG_NAMES


def main_reply_kb(lang: str) -> ReplyKeyboardMarkup:
    """Persistent bottom keyboard with the top-level sections."""
    b = ReplyKeyboardBuilder()
    b.button(text=t(lang, "btn.report"))
    b.button(text=t(lang, "btn.channels"))
    b.button(text=t(lang, "btn.account"))
    b.button(text=t(lang, "btn.autoreports"))
    b.button(text=t(lang, "btn.language"))
    b.adjust(2, 2, 1)
    return b.as_markup(resize_keyboard=True, is_persistent=True)


def lang_choice_kb():
    """Inline picker shown on first /start and on the Language button."""
    b = InlineKeyboardBuilder()
    for code, name in LANG_NAMES.items():
        b.button(text=name, callback_data=f"lang:set:{code}")
    b.adjust(1)
    return b.as_markup()
