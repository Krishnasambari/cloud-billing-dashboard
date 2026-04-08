from __future__ import annotations
from pydantic import BaseModel, model_validator
from typing import Optional


class SyncTriggerRequest(BaseModel):
    months_back: int = 12
    cloud: str = "aws"
    cloud_account: str = "default"
    # Legacy field — if provided and cloud_account is still default, it overrides cloud_account
    aws_profile: Optional[str] = None

    @model_validator(mode="after")
    def backfill_from_aws_profile(self) -> "SyncTriggerRequest":
        if self.cloud == "aws" and self.aws_profile and self.cloud_account == "default":
            self.cloud_account = self.aws_profile
        return self


class SyncStatusResponse(BaseModel):
    sync_id: int
    status: str
    started_at: str
    finished_at: Optional[str]
    months_synced: int
    cloud: str = "aws"
    cloud_account: str = ""
    aws_profile: Optional[str]
    aws_region: Optional[str]
    error_message: Optional[str]

    model_config = {"from_attributes": True}


class SyncHistoryResponse(BaseModel):
    logs: list[SyncStatusResponse]
    count: int


class CloudAccount(BaseModel):
    cloud: str
    cloud_account: str


class AccountsResponse(BaseModel):
    accounts: list[CloudAccount]
    count: int
