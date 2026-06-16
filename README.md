<div align="center">

# Metriq Flow

**Telegram + VK analytics, automated reports — one clean dashboard.**

[metriqflow.app](https://metriqflow.app) · [Start free](https://metriqflow.app/register)

[🇷🇺 Читать на русском](./README.ru.md)

</div>

---

Metriq Flow tracks your Telegram channels and VK communities in a single dashboard, generates reports on demand, and delivers them automatically on a schedule — daily, weekly, or monthly.

Built for content teams and community managers who are tired of stitching together spreadsheets.

---

## What you get

### Telegram analytics
Connect any Telegram channel by adding the bot as an admin. Metriq Flow collects:

- **Views, reactions, forwards, comments** per post — with growth badges vs. the previous period
- **Engagement rate** across 24h / 7d / 30d / all time
- **Best posting time heatmap** — averaged views by hour and day of week
- **Top posts** — clickable list, sorted by views for the selected period
- **Views-over-time chart** — area chart with daily granularity
- **Auto-refresh** every 10 minutes; new channels populate within ~10 minutes of adding

### VK analytics
Connect any public VK community by pasting its URL or screen name:

- **Reach, views, visitors** — aggregated wall stats
- **Likes, comments, reposts** per post
- **Engagement rate** and growth deltas
- **Top posts**, **heatmap**, and **reach-over-time chart**
- Periods: 24h / 7d / 30d / all time

> VK's internal audience stats (demographics, traffic sources) are closed to external apps — Metriq Flow shows only what VK's public API exposes.

### Unified dashboard
The **All** tab merges Telegram and VK into a single summary: total followers, combined views and posts, per-platform breakdowns. One screen to start your Monday.

### Reports on demand
Generate a report for any channel or community at any time. Choose:

- **Data source** — Telegram, VK, or both
- **Format** — CSV (recommended), PDF, XML
- **Period** — 24h, 7 days, 30 days, or all time

CSV reports include: date, post ID, views, reactions, forwards, comments, engagement rate, media flag, and text preview.

### Automatic reports
Set a schedule once, get reports delivered forever.

| Setting | Options |
|---|---|
| Source | Telegram / VK / All |
| Format | CSV / PDF / XML |
| Frequency | Daily / Weekly / Monthly |
| Delivery time | Any hour (0–23), timezone auto-detected from your browser |
| Delivery channel | Telegram bot DM, email, or both |

Schedules can be paused, edited, or toggled from the web app — or managed directly from the Telegram bot.

### Telegram bot
Link your Metriq Flow account to the bot with a one-time token. From Telegram you can:

- **Generate a CSV report** — pick channel → pick period → receive file in seconds
- **Manage auto-reports** — view all schedules, enable/disable, toggle Telegram delivery
- Receive scheduled reports automatically in your DMs

---

## How it works

**Step 1 — Connect your accounts**
Go to **Integrations**. For Telegram: add the bot as an admin to your channel and paste the link token. For VK: enter the community URL or screen name.

**Step 2 — Analytics appear automatically**
Metriq Flow starts collecting data immediately. Telegram stats refresh every 10 minutes; historical VK posts are imported on first connect.

**Step 3 — Get insights, generate reports**
Browse the Analytics tab for charts and heatmaps. Hit **Create report** for a one-off export. Set up a schedule in **Reports → Automatic reports** to receive data on autopilot.

---

## Pricing

| | Free | Pro | Agency |
|---|---|---|---|
| Telegram channels | 1 | Unlimited | Unlimited |
| VK communities | 1 | Unlimited | Unlimited |
| History | 7 days | Full | Full |
| Auto-reports / month | 1 | Unlimited | Unlimited |
| Report formats | CSV | CSV, PDF, XML | CSV, PDF, XML |
| Telegram bot delivery | — | ✓ | ✓ |
| Email delivery | — | ✓ | ✓ |
| AI insights | — | ✓ | ✓ |
| Multi-user | — | — | ✓ |
| **Price** | **Free** | **590 ₽/mo** | **1 990 ₽/mo** |

No credit card required to start.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, MobX, Recharts |
| Backend | Express.js, TypeScript, PostgreSQL |
| Telegram bot | Python 3, aiogram v3, Telethon |
| Auth | JWT (httpOnly cookies) |
| i18n | next-intl — Russian and English |

---

## Self-hosting

Metriq Flow is open source. You can run the full stack yourself — backend, frontend, and Telegram bot — against your own database and Telegram bot token. Self-hosting documentation is coming soon.

---

## Contributing

Pull requests are welcome. For larger changes, open an issue first to discuss what you'd like to change.

---

## License

MIT
