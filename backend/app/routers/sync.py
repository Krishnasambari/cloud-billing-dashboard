from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.deps import get_current_user
from app.models.user import User
from app.models.sync_log import SyncLog
from app.schemas.sync import SyncTriggerRequest, SyncStatusResponse, SyncHistoryResponse
from app.services import billing_service
from app.config import settings

router = APIRouter()


@router.get("/profiles")
def list_profiles(db: Session = Depends(get_db)):
    """Returns AWS profiles: ones configured in ~/.aws and ones that have synced data."""
    import os
    from app.services.billing_service import list_synced_profiles, list_configured_profiles
    aws_dir = os.path.join(os.path.expanduser("~"), ".aws")
    configured = list_configured_profiles()
    return {
        "configured": configured,
        "synced": list_synced_profiles(db),
        # debug info — remove once profiles are working
        "_aws_dir": aws_dir,
        "_config_exists": os.path.exists(os.path.join(aws_dir, "config")),
        "_credentials_exists": os.path.exists(os.path.join(aws_dir, "credentials")),
    }


def _log_to_response(log: SyncLog) -> SyncStatusResponse:
    return SyncStatusResponse(
        sync_id=log.id,
        status=log.status,
        started_at=log.started_at,
        finished_at=log.finished_at,
        months_synced=log.months_synced,
        aws_profile=log.aws_profile,
        aws_region=log.aws_region,
        error_message=log.error_message,
    )


def _run_sync_background(sync_id: int, months_back: int, aws_profile: str):
    """Background task: runs in separate DB session."""
    db = SessionLocal()
    try:
        # Re-fetch the sync log created before this task started
        sync_log = db.query(SyncLog).filter_by(id=sync_id).first()
        if not sync_log:
            return
        billing_service.run_sync_from_log(db, sync_log, months_back, aws_profile)
    finally:
        db.close()


@router.post("/trigger", status_code=202, response_model=SyncStatusResponse)
def trigger_sync(
    body: SyncTriggerRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    from datetime import datetime, timezone

    sync_log = SyncLog(
        started_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        status="running",
        aws_profile=body.aws_profile,
        aws_region=settings.AWS_REGION,
    )
    db.add(sync_log)
    db.commit()
    db.refresh(sync_log)

    background_tasks.add_task(
        _run_sync_background,
        sync_log.id,
        body.months_back,
        body.aws_profile,
    )

    return _log_to_response(sync_log)


@router.get("/status", response_model=SyncStatusResponse)
def sync_status(db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    log = db.query(SyncLog).order_by(SyncLog.id.desc()).first()
    if not log:
        raise HTTPException(status_code=404, detail="No sync has been run yet")
    return _log_to_response(log)


@router.get("/history", response_model=SyncHistoryResponse)
def sync_history(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    logs = db.query(SyncLog).order_by(SyncLog.id.desc()).limit(limit).all()
    items = [_log_to_response(l) for l in logs]
    return SyncHistoryResponse(logs=items, count=len(items))
