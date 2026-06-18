"""Lightweight i18n for the bot.

Strings live in nested dicts keyed by language. `t(lang, key, **kwargs)` resolves
a dotted key and .format()s with kwargs. `LABEL_TO_KEY` reverse-maps every
localized reply-keyboard label back to its logical action so a single handler can
route bottom-keyboard taps regardless of language.
"""
from __future__ import annotations

DEFAULT_LANG = "ru"
SUPPORTED = ("ru", "en")

# Human names for the language picker.
LANG_NAMES = {"ru": "🇷🇺 Русский", "en": "🇬🇧 English"}

STRINGS: dict[str, dict[str, str]] = {
    "ru": {
        # ── reply-keyboard buttons ──────────────────────────────────────────
        "btn.report":      "📊 Отчёт",
        "btn.channels":    "📺 Каналы",
        "btn.account":     "👤 Аккаунт",
        "btn.autoreports": "🗓 Авто-отчёты",
        "btn.language":    "🌐 Язык",

        # ── language picker ────────────────────────────────────────────────
        "lang.choose":     "🌐 <b>Выберите язык</b>\nChoose your language",
        "lang.saved":      "✅ Язык переключён на <b>Русский</b>",

        # ── start / linking ────────────────────────────────────────────────
        "start.welcome_back": "👋 <b>С возвращением, {name}!</b>\n\nВыберите раздел на клавиатуре ниже.",
        "start.unlinked":
            "👋 <b>Добро пожаловать в Metriq Flow!</b>\n\n"
            "Этот бот — ваша панель управления: подключайте каналы, отслеживайте посты, смотрите аналитику.\n\n"
            "<b>Как начать:</b>\n"
            "1. Откройте веб-приложение → <b>Настройки → Подключить Telegram</b>\n"
            "2. Скопируйте токен привязки\n"
            "3. Отправьте его сюда\n\n"
            "<i>Или используйте прямую ссылку со страницы настроек.</i>",
        "link.ok":
            "✅ <b>Аккаунт привязан!</b>\n\n"
            "Ваш профиль Metriq Flow подключён к этому Telegram.",
        "link.telegram_taken":
            "⛔ <b>Этот Telegram уже привязан к другому профилю Metriq Flow.</b>\n\n"
            "Сначала отвяжите его от того профиля, затем попробуйте снова.",
        "link.user_taken":
            "⛔ <b>К этому профилю Metriq Flow уже привязан Telegram.</b>\n\n"
            "Откройте <b>Настройки → Интеграции</b> и отвяжите текущий аккаунт.",
        "link.invalid":
            "❌ <b>Неверный или просроченный токен.</b>\n\n"
            "Получите новый в <b>Настройки → Подключить Telegram</b>.",

        # ── common ─────────────────────────────────────────────────────────
        "not_linked":      "Аккаунт не привязан. Используйте /start для привязки.",

        # ── account ────────────────────────────────────────────────────────
        "account.title":   "👤 <b>Аккаунт</b>",
        "account.name":    "Имя",
        "account.email":   "Почта",
        "account.org":     "Организация",
        "account.phone":   "Телефон",
        "account.since":   "С нами с",
        "account.channels":"Каналов подключено",
        "account.posts":   "Постов собрано",

        # ── channels ───────────────────────────────────────────────────────
        "channels.title":  "📺 <b>Каналы</b>",
        "channels.empty":
            "Пока нет каналов.\nДобавьте этого бота администратором в свой канал — он появится здесь.",
        "channels.subs":   "подп.",
        "channels.add":    "➕ Добавить канал",
        "channels.removed":"✅ Канал удалён",
        "channels.not_found": "Канал не найден.",
        "channel.subs":    "Подписчики",
        "channel.posts":   "Постов собрано",
        "channel.views":   "Всего просмотров",
        "channel.avg":     "Просм./пост",
        "channel.forwards":"Всего пересылок",
        "channel.remove":  "🗑 Удалить",
        "channel.add_title": "➕ <b>Как добавить канал</b>",
        "channel.add_steps":
            "1. Откройте канал → <b>Управление каналом</b>\n"
            "2. Перейдите в <b>Администраторы → Добавить</b>\n"
            "3. Найдите <b>{bot}</b> и добавьте\n"
            "4. Дайте право <b>Публикация сообщений</b>\n"
            "5. Канал появится здесь автоматически\n\n"
            "<i>Бот только читает статистику постов — он не может публиковать от вашего имени.</i>",

        # ── report ─────────────────────────────────────────────────────────
        "report.title":      "📊 <b>Отчёт</b>",
        "report.pick_channel":"Выберите канал:",
        "report.pick_period": "Выберите период:",
        "report.no_channels": "Пока нет каналов. Сначала добавьте бота администратором в канал.",
        "report.generating":  "⏳ Формирую CSV-отчёт…",
        "report.generating_short": "Формирую отчёт…",
        "report.empty":       "Нет постов за период <b>{period}</b>.",
        "report.ready":       "📊 <b>Отчёт готов</b>  ·  {period}",
        "report.summary":     "Постов: <b>{posts}</b>  ·  Просмотров: <b>{views}</b>  ·  Ср. ER: <b>{er}%</b>",
        "report.sent":        "✅ Отчёт отправлен выше.\n\nСформировать ещё?",
        "period.24h":  "Последние 24 ч",
        "period.7d":   "Последние 7 дней",
        "period.30d":  "Последние 30 дней",
        "period.all":  "За всё время",

        # ── auto-reports ───────────────────────────────────────────────────
        "ar.title":        "🗓 <b>Авто-отчёты</b>",
        "ar.empty":        "Пока нет расписаний.\nСоздайте их на metriqflow.app/reports",
        "ar.count":        "{n} расписаний",
        "ar.select":       "Выберите для управления:",
        "ar.not_found":    "Расписание не найдено.",
        "ar.source":       "Источник",
        "ar.format":       "Формат",
        "ar.frequency":    "Частота",
        "ar.state":        "Статус",
        "ar.tg_delivery":  "Доставка в TG",
        "ar.next":         "Следующая",
        "ar.last":         "Последняя",
        "ar.tg_enable":    "🔔 Включить доставку в TG",
        "ar.tg_disable":   "🔕 Отключить доставку в TG",
        "ar.sched_enable": "✅ Включить расписание",
        "ar.sched_disable":"🔴 Отключить расписание",
        "ar.tg_on":        "✅ ВКЛ",
        "ar.tg_off":       "🔕 ВЫКЛ",
        "ar.st_active":    "🟢 Активно",
        "ar.st_paused":    "⏸ Пауза",
        "ar.st_off":       "🔴 Выключено",
        "ar.tg_toggled_on":"Доставка в Telegram включена.",
        "ar.tg_toggled_off":"Доставка в Telegram отключена.",
        "ar.updated":      "Обновлено.",
        "freq.1":  "Ежедневно",
        "freq.7":  "Еженедельно",
        "freq.30": "Ежемесячно",

        # ── nav ────────────────────────────────────────────────────────────
        "nav.back":        "← Назад",
        "nav.back_channels":"← Каналы",
        "nav.schedules":   "← Расписания",
    },

    "en": {
        "btn.report":      "📊 Report",
        "btn.channels":    "📺 Channels",
        "btn.account":     "👤 Account",
        "btn.autoreports": "🗓 Auto-reports",
        "btn.language":    "🌐 Language",

        "lang.choose":     "🌐 <b>Choose your language</b>\nВыберите язык",
        "lang.saved":      "✅ Language switched to <b>English</b>",

        "start.welcome_back": "👋 <b>Welcome back, {name}!</b>\n\nPick a section from the keyboard below.",
        "start.unlinked":
            "👋 <b>Welcome to Metriq Flow!</b>\n\n"
            "This bot is your admin panel — connect channels, track posts, view analytics.\n\n"
            "<b>To get started:</b>\n"
            "1. Open the web app → <b>Settings → Connect Telegram</b>\n"
            "2. Copy your link token\n"
            "3. Send it here\n\n"
            "<i>Or use the deep-link from the settings page directly.</i>",
        "link.ok":
            "✅ <b>Account linked!</b>\n\n"
            "Your Metriq Flow account is connected to this Telegram.",
        "link.telegram_taken":
            "⛔ <b>This Telegram account is already linked to another Metriq Flow profile.</b>\n\n"
            "Unlink it from that profile first, then try again.",
        "link.user_taken":
            "⛔ <b>That Metriq Flow account already has a Telegram linked.</b>\n\n"
            "Go to <b>Settings → Integrations</b> and unlink the existing account first.",
        "link.invalid":
            "❌ <b>Invalid or expired token.</b>\n\n"
            "Get a fresh one from <b>Settings → Connect Telegram</b>.",

        "not_linked":      "Account not linked. Use /start to link.",

        "account.title":   "👤 <b>Account</b>",
        "account.name":    "Name",
        "account.email":   "Email",
        "account.org":     "Organization",
        "account.phone":   "Phone",
        "account.since":   "Member since",
        "account.channels":"Channels connected",
        "account.posts":   "Posts collected",

        "channels.title":  "📺 <b>Channels</b>",
        "channels.empty":
            "No channels yet.\nAdd this bot as admin to your channel and it will appear here.",
        "channels.subs":   "subs",
        "channels.add":    "➕ Add channel",
        "channels.removed":"✅ Channel removed",
        "channels.not_found": "Channel not found.",
        "channel.subs":    "Subscribers",
        "channel.posts":   "Posts collected",
        "channel.views":   "Total views",
        "channel.avg":     "Avg views/post",
        "channel.forwards":"Total forwards",
        "channel.remove":  "🗑 Remove",
        "channel.add_title": "➕ <b>How to add a channel</b>",
        "channel.add_steps":
            "1. Open your channel → <b>Manage Channel</b>\n"
            "2. Go to <b>Administrators → Add Admin</b>\n"
            "3. Search for <b>{bot}</b> and add\n"
            "4. Grant <b>Post Messages</b> permission\n"
            "5. The channel appears here automatically\n\n"
            "<i>The bot only reads post stats — it cannot post on your behalf.</i>",

        "report.title":      "📊 <b>Report</b>",
        "report.pick_channel":"Select channel:",
        "report.pick_period": "Select period:",
        "report.no_channels": "No channels yet. Add bot as admin to a channel first.",
        "report.generating":  "⏳ Generating CSV report…",
        "report.generating_short": "Generating report…",
        "report.empty":       "No posts found for <b>{period}</b>.",
        "report.ready":       "📊 <b>Report ready</b>  ·  {period}",
        "report.summary":     "Posts: <b>{posts}</b>  ·  Total views: <b>{views}</b>  ·  Avg ER: <b>{er}%</b>",
        "report.sent":        "✅ Report sent above.\n\nGenerate another?",
        "period.24h":  "Last 24 h",
        "period.7d":   "Last 7 days",
        "period.30d":  "Last 30 days",
        "period.all":  "All time",

        "ar.title":        "🗓 <b>Auto-reports</b>",
        "ar.empty":        "No schedules yet.\nCreate them at metriqflow.app/reports",
        "ar.count":        "{n} schedules",
        "ar.select":       "Select to manage:",
        "ar.not_found":    "Schedule not found.",
        "ar.source":       "Source",
        "ar.format":       "Format",
        "ar.frequency":    "Frequency",
        "ar.state":        "State",
        "ar.tg_delivery":  "TG delivery",
        "ar.next":         "Next send",
        "ar.last":         "Last",
        "ar.tg_enable":    "🔔 Enable TG delivery",
        "ar.tg_disable":   "🔕 Disable TG delivery",
        "ar.sched_enable": "✅ Enable schedule",
        "ar.sched_disable":"🔴 Disable schedule",
        "ar.tg_on":        "✅ ON",
        "ar.tg_off":       "🔕 OFF",
        "ar.st_active":    "🟢 Active",
        "ar.st_paused":    "⏸ Paused",
        "ar.st_off":       "🔴 Off",
        "ar.tg_toggled_on":"Telegram delivery enabled.",
        "ar.tg_toggled_off":"Telegram delivery disabled.",
        "ar.updated":      "Updated.",
        "freq.1":  "Daily",
        "freq.7":  "Weekly",
        "freq.30": "Monthly",

        "nav.back":        "← Back",
        "nav.back_channels":"← Channels",
        "nav.schedules":   "← Schedules",
    },
}


def t(lang: str, key: str, **kwargs) -> str:
    lang = lang if lang in STRINGS else DEFAULT_LANG
    s = STRINGS[lang].get(key) or STRINGS[DEFAULT_LANG].get(key) or key
    if kwargs:
        try:
            return s.format(**kwargs)
        except (KeyError, IndexError):
            return s
    return s


# Reverse map: every localized reply-keyboard label → logical action key.
# Lets one message handler route bottom-keyboard taps in any language.
_MENU_KEYS = ("btn.report", "btn.channels", "btn.account", "btn.autoreports", "btn.language")
LABEL_TO_KEY: dict[str, str] = {
    STRINGS[lang][key]: key
    for lang in STRINGS
    for key in _MENU_KEYS
}


def menu_action(text: str | None) -> str | None:
    """Return the logical menu key for a reply-keyboard label, or None."""
    if not text:
        return None
    return LABEL_TO_KEY.get(text.strip())
