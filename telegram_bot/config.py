from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    BOT_TOKEN: str
    BOT_USERNAME: str = ""

    TELEGRAM_API_ID: int = 0
    TELEGRAM_API_HASH: str = ""

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
