from __future__ import annotations
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.database import get_db
from app.deps import get_current_user
from app.models.notes import ServiceNote
from app.models.user import User
from app.schemas.notes import NoteUpsertRequest, NoteItem, NotesListResponse

router = APIRouter()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@router.post("", response_model=NoteItem, status_code=200)
def upsert_note(body: NoteUpsertRequest, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    now = _now_iso()
    profile = body.aws_profile or "default"
    stmt = sqlite_insert(ServiceNote).values(
        year=body.year,
        month=body.month,
        service_name=body.service_name,
        note=body.note,
        note_date=body.note_date,
        resource_id=body.resource_id,
        resource_name=body.resource_name,
        filter_name=body.filter_name,
        aws_profile=profile,
        created_at=now,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["year", "month", "service_name", "aws_profile"],
        set_={
            "note": body.note,
            "note_date": body.note_date,
            "resource_id": body.resource_id,
            "resource_name": body.resource_name,
            "filter_name": body.filter_name,
            "created_at": now,
        },
    )
    db.execute(stmt)
    db.commit()
    row = db.query(ServiceNote).filter_by(
        year=body.year, month=body.month, service_name=body.service_name, aws_profile=profile
    ).first()
    return row


@router.get("", response_model=NotesListResponse)
def get_notes_range(
    from_date: str | None = None,
    to_date: str | None = None,
    profile: str = Query(default="default"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Fetch notes filtered by note_date range and profile. Defaults to current month if no params."""
    from datetime import date
    today = date.today()
    fd = from_date or today.replace(day=1).isoformat()
    td = to_date or today.isoformat()
    rows = (
        db.query(ServiceNote)
        .filter(
            ServiceNote.note_date >= fd,
            ServiceNote.note_date <= td,
            ServiceNote.aws_profile == (profile or "default"),
        )
        .order_by(ServiceNote.note_date, ServiceNote.service_name)
        .all()
    )
    return NotesListResponse(data=rows, count=len(rows))


@router.get("/{year}/{month}", response_model=NotesListResponse)
def get_notes(
    year: int,
    month: int,
    profile: str = Query(default="default"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    rows = (
        db.query(ServiceNote)
        .filter_by(year=year, month=month, aws_profile=profile or "default")
        .order_by(ServiceNote.service_name)
        .all()
    )
    return NotesListResponse(data=rows, count=len(rows))


@router.delete("/{note_id}", status_code=204)
def delete_note(note_id: int, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    row = db.query(ServiceNote).filter_by(id=note_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(row)
    db.commit()
