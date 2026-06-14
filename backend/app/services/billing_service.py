from __future__ import annotations

from datetime import datetime, timezone, date
from dateutil.relativedelta import relativedelta

from sqlalchemy.orm import Session
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.dialects.mysql import insert as mysql_insert

from app.models.billing import MonthlyCost, ServiceCost
from app.models.sync_log import SyncLog


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _build_date_range(months_back: int) -> tuple[str, str]:
    today = date.today()
    start = (today - relativedelta(months=months_back)).replace(day=1)
    end = today.replace(day=1) + relativedelta(months=1)
    return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")


def _do_sync(
    db: Session,
    sync_log: SyncLog,
    months_back: int,
    cloud: str,
    cloud_account: str,
) -> None:
    """Core sync logic: fetch from cloud provider and upsert into DB."""
    try:
        from app.services.provider_factory import get_cost_provider
        provider = get_cost_provider(cloud, cloud_account)

        start_date, end_date = _build_date_range(months_back)
        monthly_totals = provider.fetch_monthly_totals(start_date, end_date)
        service_breakdown = provider.fetch_service_breakdown(start_date, end_date)

        now = _now_iso()
        dialect = db.get_bind().dialect.name
        upsert_insert = mysql_insert if dialect == "mysql" else sqlite_insert

        for row in monthly_totals:
            period_start = row["period_start"]
            year = int(period_start[:4])
            month = int(period_start[5:7])
            stmt = upsert_insert(MonthlyCost).values(
                year=year, month=month,
                cloud=cloud, cloud_account=cloud_account,
                aws_profile=cloud_account if cloud == "aws" else "",
                period_start=row["period_start"], period_end=row["period_end"],
                total_cost=row["total_cost"], unit=row["unit"], synced_at=now,
            )
            if dialect == "mysql":
                stmt = stmt.on_duplicate_key_update(
                    total_cost=row["total_cost"], unit=row["unit"], synced_at=now,
                )
            else:
                stmt = stmt.on_conflict_do_update(
                    index_elements=["year", "month", "cloud", "cloud_account"],
                    set_={"total_cost": row["total_cost"], "unit": row["unit"], "synced_at": now},
                )
            db.execute(stmt)

        # Fill missing months with zero cost
        from dateutil.relativedelta import relativedelta
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        current = start_dt
        existing_keys = {(int(row["period_start"][:4]), int(row["period_start"][5:7])) for row in monthly_totals}
        while current < end_dt:
            y, m = current.year, current.month
            if (y, m) not in existing_keys:
                period_start_str = current.strftime("%Y-%m-01")
                # calculate end of month
                next_month = current + relativedelta(months=1)
                period_end_str = (next_month - relativedelta(days=1)).strftime("%Y-%m-%d")
                zero_stmt = upsert_insert(MonthlyCost).values(
                    year=y, month=m,
                    cloud=cloud, cloud_account=cloud_account,
                    aws_profile=cloud_account if cloud == "aws" else "",
                    period_start=period_start_str, period_end=period_end_str,
                    total_cost=0.0, unit="USD", synced_at=now,
                )
                if dialect == "mysql":
                    zero_stmt = zero_stmt.on_duplicate_key_update(
                        total_cost=0.0, unit="USD", synced_at=now,
                    )
                else:
                    zero_stmt = zero_stmt.on_conflict_do_update(
                        index_elements=["year", "month", "cloud", "cloud_account"],
                        set_={"total_cost": 0.0, "unit": "USD", "synced_at": now},
                    )
                db.execute(zero_stmt)
            current += relativedelta(months=1)
        db.commit()

        monthly_map: dict[tuple[int, int], int] = {}
        for row in monthly_totals:
            period_start = row["period_start"]
            year, month = int(period_start[:4]), int(period_start[5:7])
            mc = db.query(MonthlyCost).filter_by(
                year=year, month=month, cloud=cloud, cloud_account=cloud_account
            ).first()
            if mc:
                monthly_map[(year, month)] = mc.id

        for row in service_breakdown:
            period_start = row["period_start"]
            year, month = int(period_start[:4]), int(period_start[5:7])
            monthly_cost_id = monthly_map.get((year, month))
            if not monthly_cost_id:
                continue
            if dialect == "mysql":
                stmt = upsert_insert(ServiceCost).values(
                    monthly_cost_id=monthly_cost_id,
                    service_name=row["service_name"], cost=row["cost"],
                    unit=row["unit"], synced_at=now,
                )
                stmt = stmt.on_duplicate_key_update(
                    cost=row["cost"], unit=row["unit"], synced_at=now,
                )
            else:
                stmt = upsert_insert(ServiceCost).values(
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


def run_sync(
    db: Session,
    months_back: int,
    cloud: str,
    cloud_account: str,
) -> SyncLog:
    from app.config import settings
    sync_log = SyncLog(
        started_at=_now_iso(), status="running",
        cloud=cloud, cloud_account=cloud_account,
        aws_profile=cloud_account if cloud == "aws" else None,
        aws_region=settings.AWS_REGION if cloud == "aws" else None,
    )
    db.add(sync_log)
    db.commit()
    db.refresh(sync_log)
    _do_sync(db, sync_log, months_back, cloud, cloud_account)
    return sync_log


def run_sync_from_log(
    db: Session, sync_log: SyncLog, months_back: int, cloud: str, cloud_account: str
) -> None:
    try:
        _do_sync(db, sync_log, months_back, cloud, cloud_account)
    except Exception:
        pass


def list_synced_cloud_accounts(db: Session) -> list[dict]:
    rows = db.query(MonthlyCost.cloud, MonthlyCost.cloud_account).distinct().all()
    return [{"cloud": r[0], "cloud_account": r[1]} for r in rows if r[0] and r[1]]


def list_configured_profiles() -> list[str]:
    import subprocess, configparser, os
    try:
        result = subprocess.run(
            ["aws", "configure", "list-profiles"],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode == 0:
            profiles = [p.strip() for p in result.stdout.splitlines() if p.strip()]
            if profiles:
                return sorted(profiles)
    except Exception:
        pass

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


def get_monthly_costs(
    db: Session,
    year: int | None = None,
    limit: int = 24,
    cloud: str = "aws",
    cloud_account: str = "",
) -> list[MonthlyCost]:
    q = db.query(MonthlyCost).filter(
        MonthlyCost.cloud == cloud,
        MonthlyCost.cloud_account == cloud_account,
    )
    if year:
        q = q.filter(MonthlyCost.year == year)
    return q.order_by(MonthlyCost.year.desc(), MonthlyCost.month.desc()).limit(limit).all()


def get_monthly_cost(
    db: Session, year: int, month: int, cloud: str = "aws", cloud_account: str = ""
) -> MonthlyCost | None:
    return db.query(MonthlyCost).filter_by(
        year=year, month=month, cloud=cloud, cloud_account=cloud_account
    ).first()


def get_service_costs(
    db: Session,
    year: int,
    month: int,
    sort_by: str = "cost",
    min_cost: float = 0.0,
    cloud: str = "aws",
    cloud_account: str = "",
) -> tuple[MonthlyCost | None, list[ServiceCost]]:
    mc = get_monthly_cost(db, year, month, cloud=cloud, cloud_account=cloud_account)
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


def get_summary(
    db: Session, cloud: str = "aws", cloud_account: str = ""
) -> dict:
    today = date.today()
    # Fetch the two most recent months with data for the given cloud/account
    recent_months = (
        db.query(MonthlyCost)
        .filter_by(cloud=cloud, cloud_account=cloud_account)
        .order_by(MonthlyCost.year.desc(), MonthlyCost.month.desc())
        .limit(2)
        .all()
    )
    if not recent_months:
        current = last = None
    elif len(recent_months) == 1:
        current = recent_months[0]
        last = None
    else:
        current, last = recent_months[0], recent_months[1]
    ytd_rows = db.query(MonthlyCost).filter(
        MonthlyCost.year == today.year,
        MonthlyCost.cloud == cloud,
        MonthlyCost.cloud_account == cloud_account,
    ).all()
    ytd_total = sum(r.total_cost for r in ytd_rows)
    mom_change = None
    if current and last and last.total_cost > 0:
        mom_change = round((current.total_cost - last.total_cost) / last.total_cost * 100, 1)

    # Determine label for the previous month if available
    if last:
        last_month_date = date(last.year, last.month, 1)
    else:
        last_month_date = None

    return {
        "current_month": {
            "label": f"{today.strftime('%b')} {today.year}",
            "cost": round(current.total_cost, 4) if current else 0.0,
            "unit": current.unit if current else "USD",
        },
        "last_month": {
            "label": f"{last_month_date.strftime('%b')} {last_month_date.year}" if last_month_date else "",
            "cost": round(last.total_cost, 4) if last else 0.0,
            "unit": last.unit if last else "USD",
        },
        "ytd": {"year": today.year, "cost": round(ytd_total, 4), "unit": "USD"},
        "mom_change_pct": mom_change,
    }
