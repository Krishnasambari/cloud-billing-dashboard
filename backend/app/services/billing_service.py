from __future__ import annotations

from datetime import datetime, timezone, date
from dateutil.relativedelta import relativedelta

from sqlalchemy.orm import Session
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.models.billing import MonthlyCost, ServiceCost
from app.models.sync_log import SyncLog
from app.services.aws_cost_explorer import fetch_monthly_totals, fetch_service_breakdown, AWSError


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _build_date_range(months_back: int) -> tuple[str, str]:
    today = date.today()
    start = (today - relativedelta(months=months_back)).replace(day=1)
    end = today.replace(day=1) + relativedelta(months=1)
    return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")


def _do_sync(db: Session, sync_log: SyncLog, months_back: int, aws_profile: str) -> None:
    """Core sync logic: fetch from AWS and upsert into DB. Updates sync_log in place."""
    try:
        start_date, end_date = _build_date_range(months_back)

        monthly_totals = fetch_monthly_totals(start_date, end_date, profile=aws_profile)
        service_breakdown = fetch_service_breakdown(start_date, end_date, profile=aws_profile)

        now = _now_iso()

        for row in monthly_totals:
            period_start = row["period_start"]
            year = int(period_start[:4])
            month = int(period_start[5:7])
            stmt = sqlite_insert(MonthlyCost).values(
                year=year, month=month, aws_profile=aws_profile,
                period_start=row["period_start"], period_end=row["period_end"],
                total_cost=row["total_cost"], unit=row["unit"], synced_at=now,
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["year", "month", "aws_profile"],
                set_={
                    "period_start": row["period_start"], "period_end": row["period_end"],
                    "total_cost": row["total_cost"], "unit": row["unit"], "synced_at": now,
                },
            )
            db.execute(stmt)
        db.commit()

        monthly_map: dict[tuple[int, int], int] = {}
        for row in monthly_totals:
            period_start = row["period_start"]
            year, month = int(period_start[:4]), int(period_start[5:7])
            mc = db.query(MonthlyCost).filter_by(year=year, month=month, aws_profile=aws_profile).first()
            if mc:
                monthly_map[(year, month)] = mc.id

        for row in service_breakdown:
            period_start = row["period_start"]
            year, month = int(period_start[:4]), int(period_start[5:7])
            monthly_cost_id = monthly_map.get((year, month))
            if not monthly_cost_id:
                continue
            stmt = sqlite_insert(ServiceCost).values(
                monthly_cost_id=monthly_cost_id,
                service_name=row["service_name"], cost=row["cost"],
                unit=row["unit"], synced_at=now,
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["monthly_cost_id", "service_name"],
                set_={"cost": row["cost"], "unit": row["unit"], "synced_at": now},
            )
            db.execute(stmt)
        db.commit()

        sync_log.status = "success"
        sync_log.months_synced = len(monthly_totals)
        sync_log.finished_at = _now_iso()
        db.commit()

    except Exception as e:
        sync_log.status = "error"
        sync_log.error_message = str(e)
        sync_log.finished_at = _now_iso()
        db.commit()
        raise


def run_sync(db: Session, months_back: int, aws_profile: str, aws_region: str) -> SyncLog:
    sync_log = SyncLog(
        started_at=_now_iso(), status="running",
        aws_profile=aws_profile, aws_region=aws_region,
    )
    db.add(sync_log)
    db.commit()
    db.refresh(sync_log)
    _do_sync(db, sync_log, months_back, aws_profile)
    return sync_log


def run_sync_from_log(db: Session, sync_log: SyncLog, months_back: int, aws_profile: str) -> None:
    """Called from background task with a pre-created SyncLog record."""
    try:
        _do_sync(db, sync_log, months_back, aws_profile)
    except Exception:
        pass  # errors already recorded in sync_log by _do_sync


def list_synced_profiles(db: Session) -> list[str]:
    """Return distinct aws_profile values that have data in monthly_costs."""
    rows = db.query(MonthlyCost.aws_profile).distinct().all()
    return sorted({r[0] for r in rows if r[0]})


def list_configured_profiles() -> list[str]:
    """Return AWS CLI profiles using `aws configure list-profiles`, with file-parse fallback."""
    import subprocess
    import configparser
    import os

    # Primary: use the AWS CLI itself — most reliable
    try:
        result = subprocess.run(
            ["aws", "configure", "list-profiles"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            profiles = [p.strip() for p in result.stdout.splitlines() if p.strip()]
            if profiles:
                return sorted(profiles)
    except Exception:
        pass

    # Fallback: parse ~/.aws/config and ~/.aws/credentials directly
    profiles: set[str] = set()
    aws_dir = os.path.join(os.path.expanduser("~"), ".aws")
    for filename, has_prefix in [("config", True), ("credentials", False)]:
        path = os.path.join(aws_dir, filename)
        if not os.path.exists(path):
            continue
        try:
            cfg = configparser.ConfigParser()
            cfg.read(path, encoding="utf-8-sig")
            for section in cfg.sections():
                name = section[8:].strip() if (has_prefix and section.startswith("profile ")) else section
                if name:
                    profiles.add(name)
        except Exception:
            pass

    return sorted(profiles)


def get_monthly_costs(db: Session, year: int | None = None, limit: int = 24, profile: str = "") -> list[MonthlyCost]:
    q = db.query(MonthlyCost).filter(MonthlyCost.aws_profile == profile)
    if year:
        q = q.filter(MonthlyCost.year == year)
    return q.order_by(MonthlyCost.year.desc(), MonthlyCost.month.desc()).limit(limit).all()


def get_monthly_cost(db: Session, year: int, month: int, profile: str = "") -> MonthlyCost | None:
    return db.query(MonthlyCost).filter_by(year=year, month=month, aws_profile=profile).first()


def get_service_costs(
    db: Session, year: int, month: int, sort_by: str = "cost", min_cost: float = 0.0, profile: str = ""
) -> tuple[MonthlyCost | None, list[ServiceCost]]:
    mc = get_monthly_cost(db, year, month, profile=profile)
    if not mc:
        return None, []

    q = db.query(ServiceCost).filter(
        ServiceCost.monthly_cost_id == mc.id,
        ServiceCost.cost >= min_cost,
    )
    if sort_by == "name":
        q = q.order_by(ServiceCost.service_name)
    else:
        q = q.order_by(ServiceCost.cost.desc())

    return mc, q.all()


def get_summary(db: Session, profile: str = "") -> dict:
    today = date.today()

    current = db.query(MonthlyCost).filter_by(year=today.year, month=today.month, aws_profile=profile).first()
    last_month_date = date(today.year, today.month, 1) - relativedelta(months=1)
    last = db.query(MonthlyCost).filter_by(
        year=last_month_date.year, month=last_month_date.month, aws_profile=profile
    ).first()

    ytd_rows = db.query(MonthlyCost).filter(MonthlyCost.year == today.year, MonthlyCost.aws_profile == profile).all()
    ytd_total = sum(r.total_cost for r in ytd_rows)

    mom_change = None
    if current and last and last.total_cost > 0:
        mom_change = round((current.total_cost - last.total_cost) / last.total_cost * 100, 1)

    return {
        "current_month": {
            "label": f"{today.strftime('%b')} {today.year}",
            "cost": round(current.total_cost, 4) if current else 0.0,
            "unit": current.unit if current else "USD",
        },
        "last_month": {
            "label": f"{last_month_date.strftime('%b')} {last_month_date.year}",
            "cost": round(last.total_cost, 4) if last else 0.0,
            "unit": last.unit if last else "USD",
        },
        "ytd": {
            "year": today.year,
            "cost": round(ytd_total, 4),
            "unit": "USD",
        },
        "mom_change_pct": mom_change,
    }
