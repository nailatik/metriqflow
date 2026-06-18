# Telegram bot (aiogram + telethon). Shares the compose Postgres with backend.
# Telethon session is persisted in /app/sessions via a named volume (see compose).
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/sessions

CMD ["python", "-u", "bot.py"]
