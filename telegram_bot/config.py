from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    BOT_TOKEN: str
    BOT_USERNAME: str = ""

    TELEGRAM_API_ID: int = 0
    TELEGRAM_API_HASH: str = ""

    # Optional egress relay for the Bot API (e.g. Cloudflare Worker) on hosts
    # where api.telegram.org is unreachable (RU/RKN). Same relay the backend
    # uses: https://relay.metriqflow.ru/telegram → api.telegram.org. Empty =
    # talk to api.telegram.org directly. No trailing slash.
    TELEGRAM_API_BASE: str = ""

    # Where the telethon .session file lives ("." = cwd on dev; a mounted
    # volume path like /app/sessions in prod so it survives container rebuilds).
    SESSION_DIR: str = "."

    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "metriq"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "metriq"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
