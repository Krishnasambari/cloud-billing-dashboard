from __future__ import annotations
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.database import get_db
from app.models.notes import ServiceNote
from app.schemas.notes import NoteUpsertRequest, NoteItem, NotesListResponse

router = APIRouter()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@router.post("", response_model=NoteItem, status_code=200)
def upsert_note(body: NoteUpsertRequest, db: Session = Depends(get_db)):
    now = _now_iso()
    stmt = sqlite_insert(ServiceNote).values(
        year=body.year,
        month=body.month,
        service_name=body.service_name,
        note=body.note,
        note_date=body.note_date,
        resource_id=body.resource_id,
        resource_name=body.resource_name,
        created_at=now,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["year", "month", "service_name"],
        set_={
            "note": body.note,
            "note_date": body.note_date,
            "resource_id": body.resource_id,
            "resource_name": body.resource_name,
            "created_at": now,
        },
    )
    db.execute(stmt)
    db.commit()
    row = db.query(ServiceNote).filter_by(
        year=body.year, month=body.month, service_name=body.service_name
    ).first()
    return row


@router.get("", response_model=NotesListResponse)
def get_notes_range(
    from_date: str | None = None,
    to_date: str | None = None,
    db: Session = Depends(get_db),
):
    """Fetch notes filtered by note_date range. Defaults to current month if no params."""
    from datetime import date
    today = date.today()
    fd = from_date or today.replace(day=1).isoformat()
    td = to_date or today.isoformat()
    rows = (
        db.query(ServiceNote)
        .filter(ServiceNote.note_date >= fd, ServiceNote.note_date <= td)
        .order_by(ServiceNote.note_date, ServiceNote.service_name)
        .all()
    )
    return NotesListResponse(data=rows, count=len(rows))


@router.get("/{year}/{month}", response_model=NotesListResponse)
def get_notes(year: int, month: int, db: Session = Depends(get_db)):
    rows = (
        db.query(ServiceNote)
        .filter_by(year=year, month=month)
        .order_by(ServiceNote.service_name)
        .all()
    )
    return NotesListResponse(data=rows, count=len(rows))


@router.delete("/{note_id}", status_code=204)
def delete_note(note_id: int, db: Session = Depends(get_db)):
    row = db.query(ServiceNote).filter_by(id=note_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(row)
    db.commit()
