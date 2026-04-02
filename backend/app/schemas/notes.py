from __future__ import annotations
from pydantic import BaseModel


class NoteUpsertRequest(BaseModel):
    year: int
    month: int
    service_name: str
    note: str
    note_date: str   # YYYY-MM-DD
    resource_id: str | None = None
    resource_name: str | None = None
    filter_name: str | None = None
    aws_profile: str = "default"


class NoteItem(BaseModel):
    id: int
    year: int
    month: int
    service_name: str
    note: str
    note_date: str
    resource_id: str | None
    resource_name: str | None
    filter_name: str | None
    aws_profile: str
    created_at: str

    model_config = {"from_attributes": True}


class NotesListResponse(BaseModel):
    data: list[NoteItem]
    count: int
