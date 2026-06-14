from pydantic_settings import BaseSettings
from pydantic import computed_field
from typing import List
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_ENV_PATH = _PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    model_config = {
        "env_file": str(_ENV_PATH),
        "env_file_encoding": "utf-8"
    }

    AWS_PROFILE: str = "default"
    AWS_REGION: str = "ap-south-1"
    DB_PATH: str = "../data/billing.db"
    MYSQL_URL: str = ""
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]
    SYNC_MONTHS_DEFAULT: int = 12
    SECRET_KEY: str = "change-me-in-production"
    PROFILE_SYNC_CHECK_INTERVAL: int = 300

    # Azure — leave empty to disable Azure support
    AZURE_TENANT_ID: str = ""
    AZURE_CLIENT_ID: str = ""
    AZURE_CLIENT_SECRET: str = ""
    AZURE_SUBSCRIPTION_IDS: str = ""  # comma-separated list of subscription IDs

    @computed_field
    @property
    def azure_configured(self) -> bool:
        return all([
            self.AZURE_TENANT_ID,
            self.AZURE_CLIENT_ID,
            self.AZURE_CLIENT_SECRET,
            self.AZURE_SUBSCRIPTION_IDS,
        ])


settings = Settings()