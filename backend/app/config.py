from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    AWS_PROFILE: str = "default"
    AWS_REGION: str = "ap-south-1"
    DB_PATH: str = "../data/billing.db"
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]
    SYNC_MONTHS_DEFAULT: int = 12

    model_config = {"env_file": "../../.env", "env_file_encoding": "utf-8"}


settings = Settings()
