from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./finance.db"
    SECRET_KEY: str = "change_this"
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "change_this"
    GEMINI_API_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
