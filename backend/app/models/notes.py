from sqlalchemy import Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ServiceNote(Base):
    __tablename__ = "service_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    service_name: Mapped[str] = mapped_column(String(200), nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False)
    note_date: Mapped[str] = mapped_column(String(10), nullable=False)   # YYYY-MM-DD
    resource_id: Mapped[str | None] = mapped_column(String(500), nullable=True)
    resource_name: Mapped[str | None] = mapped_column(String(500), nullable=True)
    filter_name: Mapped[str | None] = mapped_column(String(20), nullable=True)
    aws_profile: Mapped[str] = mapped_column(String(100), nullable=False, default="default")
    created_at: Mapped[str] = mapped_column(String(30), nullable=False)

    __table_args__ = (
        UniqueConstraint("year", "month", "service_name", "aws_profile", name="uq_note_year_month_service_profile"),
    )
