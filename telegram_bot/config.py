from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    BOT_TOKEN: str
    BOT_USERNAME: str = ""

    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "metriq"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "metriq"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
