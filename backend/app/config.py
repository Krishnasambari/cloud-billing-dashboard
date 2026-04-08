from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    AWS_PROFILE: str = "default"
    AWS_REGION: str = "ap-south-1"
    DB_PATH: str = "../data/billing.db"
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]
    SYNC_MONTHS_DEFAULT: int = 12
    SECRET_KEY: str = "change-me-in-production"
    # Azure — leave empty to disable Azure support
    AZURE_TENANT_ID: str = ""
    AZURE_CLIENT_ID: str = ""
    AZURE_CLIENT_SECRET: str = ""
    AZURE_SUBSCRIPTION_IDS: str = ""   # comma-separated list of subscription IDs

    model_config = {"env_file": "../../.env", "env_file_encoding": "utf-8"}

    @property
    def azure_subscription_list(self) -> list[str]:
        return [s.strip() for s in self.AZURE_SUBSCRIPTION_IDS.split(",") if s.strip()]

    @property
    def azure_configured(self) -> bool:
        return bool(self.AZURE_TENANT_ID and self.AZURE_CLIENT_ID and self.AZURE_CLIENT_SECRET)


settings = Settings()
