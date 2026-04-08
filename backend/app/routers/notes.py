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
    stmt = sqlite_insert(ServiceNote).values(
        year=body.year,
        month=body.month,
        service_name=body.service_name,
        note=body.note,
        note_date=body.note_date,
        resource_id=body.resource_id,
        resource_name=body.resource_name,
        filter_name=body.filter_name,
        aws_profile=body.cloud_account,
        cloud=body.cloud,
        cloud_account=body.cloud_account,
        created_at=now,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["year", "month", "service_name", "cloud", "cloud_account"],
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
        year=body.year, month=body.month, service_name=body.service_name,
        cloud=body.cloud, cloud_account=body.cloud_account,
    ).first()
    return row


@router.get("", response_model=NotesListResponse)
def get_notes_range(
    from_date: str | None = None,
    to_date: str | None = None,
    cloud: str = Query(default="aws"),
    cloud_account: str = Query(default=""),
    profile: str = Query(default="", description="Deprecated: use cloud_account"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    from datetime import date
    today = date.today()
    fd = from_date or today.replace(day=1).isoformat()
    td = to_date or today.isoformat()
    effective_account = cloud_account or profile or "default"
    rows = (
        db.query(ServiceNote)
        .filter(
            ServiceNote.note_date >= fd,
            ServiceNote.note_date <= td,
            ServiceNote.cloud == cloud,
            ServiceNote.cloud_account == effective_account,
        )
        .order_by(ServiceNote.note_date, ServiceNote.service_name)
        .all()
    )
    return NotesListResponse(data=rows, count=len(rows))


@router.get("/{year}/{month}", response_model=NotesListResponse)
def get_notes(
    year: int,
    month: int,
    cloud: str = Query(default="aws"),
    cloud_account: str = Query(default=""),
    profile: str = Query(default="", description="Deprecated: use cloud_account"),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    effective_account = cloud_account or profile or "default"
    rows = (
        db.query(ServiceNote)
        .filter_by(year=year, month=month, cloud=cloud, cloud_account=effective_account)
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
