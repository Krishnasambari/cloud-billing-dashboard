from __future__ import annotations
from pydantic import BaseModel
from typing import Optional


class SyncTriggerRequest(BaseModel):
    months_back: int = 12
    aws_profile: str = "default"


class SyncStatusResponse(BaseModel):
    sync_id: int
    status: str
    started_at: str
    finished_at: Optional[str]
    months_synced: int
    aws_profile: Optional[str]
    aws_region: Optional[str]
    error_message: Optional[str]

    model_config = {"from_attributes": True}


class SyncHistoryResponse(BaseModel):
    logs: list[SyncStatusResponse]
    count: int
