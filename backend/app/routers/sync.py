from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.deps import get_current_user
from app.models.user import User
from app.models.sync_log import SyncLog
from app.schemas.sync import (
    SyncTriggerRequest, SyncStatusResponse, SyncHistoryResponse,
    CloudAccount, AccountsResponse,
)
from app.services import billing_service
from app.config import settings

router = APIRouter()


def _log_to_response(log: SyncLog) -> SyncStatusResponse:
    return SyncStatusResponse(
        sync_id=log.id,
        status=log.status,
        started_at=log.started_at,
        finished_at=log.finished_at,
        months_synced=log.months_synced,
        cloud=getattr(log, "cloud", "aws") or "aws",
        cloud_account=getattr(log, "cloud_account", "") or "",
        aws_profile=log.aws_profile,
        aws_region=log.aws_region,
        error_message=log.error_message,
    )


def _run_sync_background(sync_id: int, months_back: int, cloud: str, cloud_account: str):
    """Background task: runs in separate DB session."""
    db = SessionLocal()
    try:
        sync_log = db.query(SyncLog).filter_by(id=sync_id).first()
        if not sync_log:
            return
        billing_service.run_sync_from_log(db, sync_log, months_back, cloud, cloud_account)
    finally:
        db.close()


@router.post("/trigger", status_code=202, response_model=SyncStatusResponse)
def trigger_sync(
    body: SyncTriggerRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    from datetime import datetime, timezone

    sync_log = SyncLog(
        started_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        status="running",
        cloud=body.cloud,
        cloud_account=body.cloud_account,
        aws_profile=body.cloud_account if body.cloud == "aws" else None,
        aws_region=settings.AWS_REGION if body.cloud == "aws" else None,
    )
    db.add(sync_log)
    db.commit()
    db.refresh(sync_log)

    background_tasks.add_task(
        _run_sync_background,
        sync_log.id,
        body.months_back,
        body.cloud,
        body.cloud_account,
    )

    return _log_to_response(sync_log)


@router.get("/status", response_model=SyncStatusResponse)
def sync_status(db: Session = Depends(get_db)):
    log = db.query(SyncLog).order_by(SyncLog.id.desc()).first()
    if not log:
        raise HTTPException(status_code=404, detail="No sync has been run yet")
    return _log_to_response(log)


@router.get("/history", response_model=SyncHistoryResponse)
def sync_history(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    logs = db.query(SyncLog).order_by(SyncLog.id.desc()).limit(limit).all()
    items = [_log_to_response(l) for l in logs]
    return SyncHistoryResponse(logs=items, count=len(items))


@router.get("/accounts", response_model=AccountsResponse)
def list_accounts(db: Session = Depends(get_db)):
    """Return all cloud accounts that have synced data, plus configured AWS profiles."""
    synced = billing_service.list_synced_cloud_accounts(db)
    configured_aws = billing_service.list_configured_profiles()

    # Build a combined list — synced accounts first, then configured AWS profiles not yet synced
    synced_keys = {(a["cloud"], a["cloud_account"]) for a in synced}
    accounts = [CloudAccount(cloud=a["cloud"], cloud_account=a["cloud_account"]) for a in synced]
    for p in configured_aws:
        if ("aws", p) not in synced_keys:
            accounts.append(CloudAccount(cloud="aws", cloud_account=p))

    # Azure subscriptions from config
    from app.config import settings as s
    if s.azure_configured:
        for sub in s.azure_subscription_list:
            if ("azure", sub) not in synced_keys:
                accounts.append(CloudAccount(cloud="azure", cloud_account=sub))

    return AccountsResponse(accounts=accounts, count=len(accounts))


@router.get("/profiles")
def list_profiles(db: Session = Depends(get_db)):
    """Legacy endpoint — returns AWS profiles for backward compatibility."""
    import os
    configured = billing_service.list_configured_profiles()
    synced_accounts = billing_service.list_synced_cloud_accounts(db)
    synced_aws = [a["cloud_account"] for a in synced_accounts if a["cloud"] == "aws"]
    aws_dir = os.path.join(os.path.expanduser("~"), ".aws")
    return {
        "configured": configured,
        "synced": synced_aws,
        "_aws_dir": aws_dir,
        "_config_exists": os.path.exists(os.path.join(aws_dir, "config")),
        "_credentials_exists": os.path.exists(os.path.join(aws_dir, "credentials")),
    }
