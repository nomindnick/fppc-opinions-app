"""Application settings via pydantic-settings / environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    env: str = "development"
    port: int = 8000
    openai_api_key: str = ""
    r2_pdf_base_url: str = ""

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
