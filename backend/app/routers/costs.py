from __future__ import annotations

import calendar
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.billing import (
    MonthlyCostListResponse,
    MonthlyCostItem,
    ServiceBreakdownResponse,
    ServiceCostItem,
    SummaryResponse,
)
from app.services import billing_service

router = APIRouter()


def _month_label(year: int, month: int) -> str:
    return f"{calendar.month_abbr[month]} {year}"


@router.get("/monthly", response_model=MonthlyCostListResponse)
def list_monthly_costs(
    year: int | None = Query(None),
    limit: int = Query(24, ge=1, le=120),
    profile: str = Query("", description="AWS CLI profile name"),
    db: Session = Depends(get_db),
):
    rows = billing_service.get_monthly_costs(db, year=year, limit=limit, profile=profile)
    items = [
        MonthlyCostItem(
            year=r.year,
            month=r.month,
            period_start=r.period_start,
            period_end=r.period_end,
            total_cost=round(r.total_cost, 4),
            unit=r.unit,
            label=_month_label(r.year, r.month),
        )
        for r in rows
    ]
    return MonthlyCostListResponse(data=items, count=len(items))


@router.get("/monthly/{year}/{month}", response_model=MonthlyCostItem)
def get_monthly_cost(year: int, month: int, profile: str = Query("", description="AWS CLI profile name"), db: Session = Depends(get_db)):
    row = billing_service.get_monthly_cost(db, year=year, month=month, profile=profile)
    if not row:
        raise HTTPException(status_code=404, detail=f"No data for {_month_label(year, month)}")
    return MonthlyCostItem(
        year=row.year,
        month=row.month,
        period_start=row.period_start,
        period_end=row.period_end,
        total_cost=round(row.total_cost, 4),
        unit=row.unit,
        label=_month_label(row.year, row.month),
    )


@router.get("/services/{year}/{month}", response_model=ServiceBreakdownResponse)
def get_service_costs(
    year: int,
    month: int,
    sort_by: str = Query("cost", pattern="^(cost|name)$"),
    min_cost: float = Query(0.01, ge=0),
    profile: str = Query("", description="AWS CLI profile name"),
    db: Session = Depends(get_db),
):
    mc, services = billing_service.get_service_costs(
        db, year=year, month=month, sort_by=sort_by, min_cost=min_cost, profile=profile
    )
    if not mc:
        raise HTTPException(status_code=404, detail=f"No data for {_month_label(year, month)}")

    total = mc.total_cost or 1.0  # avoid division by zero
    items = [
        ServiceCostItem(
            service_name=s.service_name,
            cost=round(s.cost, 4),
            unit=s.unit,
            percentage=round(s.cost / total * 100, 1),
        )
        for s in services
    ]
    return ServiceBreakdownResponse(
        year=year,
        month=month,
        label=_month_label(year, month),
        total_cost=round(mc.total_cost, 4),
        services=items,
        count=len(items),
    )


@router.get("/summary", response_model=SummaryResponse)
def get_summary(profile: str = Query("", description="AWS CLI profile name"), db: Session = Depends(get_db)):
    data = billing_service.get_summary(db, profile=profile)
    return SummaryResponse(**data)
