from datetime import datetime
from sqlalchemy import Integer, Float, String, Text, UniqueConstraint, Index, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MonthlyCost(Base):
    __tablename__ = "monthly_costs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    aws_profile: Mapped[str] = mapped_column(String(100), nullable=False, default="default")
    period_start: Mapped[str] = mapped_column(String(10), nullable=False)
    period_end: Mapped[str] = mapped_column(String(10), nullable=False)
    total_cost: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(10), nullable=False, default="USD")
    synced_at: Mapped[str] = mapped_column(String(30), nullable=False)

    service_costs: Mapped[list["ServiceCost"]] = relationship(
        "ServiceCost", back_populates="monthly_cost", cascade="all, delete-orphan"
    )

    __table_args__ = (UniqueConstraint("year", "month", "aws_profile", name="uq_monthly_year_month_profile"),)


class ServiceCost(Base):
    __tablename__ = "service_costs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    monthly_cost_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("monthly_costs.id", ondelete="CASCADE"), nullable=False
    )
    service_name: Mapped[str] = mapped_column(String(200), nullable=False)
    cost: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(10), nullable=False, default="USD")
    usage_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    synced_at: Mapped[str] = mapped_column(String(30), nullable=False)

    monthly_cost: Mapped["MonthlyCost"] = relationship(
        "MonthlyCost", back_populates="service_costs"
    )

    __table_args__ = (
        UniqueConstraint(
            "monthly_cost_id", "service_name", name="uq_service_monthly_name"
        ),
        Index("ix_service_costs_monthly_cost_id", "monthly_cost_id"),
    )
