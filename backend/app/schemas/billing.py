from __future__ import annotations
from pydantic import BaseModel
from typing import Optional


class MonthlyCostItem(BaseModel):
    year: int
    month: int
    period_start: str
    period_end: str
    total_cost: float
    unit: str
    label: str

    model_config = {"from_attributes": True}


class MonthlyCostListResponse(BaseModel):
    data: list[MonthlyCostItem]
    count: int
    currency: str = "USD"


class ServiceCostItem(BaseModel):
    service_name: str
    cost: float
    unit: str
    percentage: float

    model_config = {"from_attributes": True}


class ServiceBreakdownResponse(BaseModel):
    year: int
    month: int
    label: str
    total_cost: float
    services: list[ServiceCostItem]
    count: int


class SummaryMonthItem(BaseModel):
    label: str
    cost: float
    unit: str


class SummaryYTD(BaseModel):
    year: int
    cost: float
    unit: str


class SummaryResponse(BaseModel):
    current_month: SummaryMonthItem
    last_month: SummaryMonthItem
    ytd: SummaryYTD
    mom_change_pct: Optional[float]
