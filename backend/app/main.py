from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.routers import costs, sync, notes, resources, auth, admin

# Import models so SQLAlchemy registers them before create_all
import app.models.billing   # noqa: F401
import app.models.sync_log  # noqa: F401
import app.models.notes     # noqa: F401
import app.models.user      # noqa: F401

app = FastAPI(
    title="AWS Billing Dashboard",
    version="1.0.0",
    description="API for syncing and visualizing AWS Cost Explorer data",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,      prefix="/api/auth",    tags=["auth"])
app.include_router(admin.router,     prefix="/api/admin",   tags=["admin"])
app.include_router(costs.router,     prefix="/api/costs",   tags=["costs"])
app.include_router(sync.router,      prefix="/api/sync",    tags=["sync"])
app.include_router(notes.router,     prefix="/api/notes",   tags=["notes"])
app.include_router(resources.router, prefix="/api/resources", tags=["resources"])


def _migrate_db() -> None:
    """Run incremental SQLite migrations that create_all can't handle."""
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    if "service_notes" in inspector.get_table_names():
        note_cols = [c["name"] for c in inspector.get_columns("service_notes")]
        if "filter_name" not in note_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE service_notes ADD COLUMN filter_name VARCHAR(20)"))

    if "monthly_costs" not in inspector.get_table_names():
        return
    cols = [c["name"] for c in inspector.get_columns("monthly_costs")]
    if "aws_profile" not in cols:
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE monthly_costs_new (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    year       INTEGER     NOT NULL,
                    month      INTEGER     NOT NULL,
                    aws_profile VARCHAR(100) NOT NULL DEFAULT 'default',
                    period_start VARCHAR(10) NOT NULL,
                    period_end   VARCHAR(10) NOT NULL,
                    total_cost   FLOAT      NOT NULL,
                    unit         VARCHAR(10) NOT NULL DEFAULT 'USD',
                    synced_at    VARCHAR(30) NOT NULL,
                    UNIQUE (year, month, aws_profile)
                )
            """))
            conn.execute(text("""
                INSERT INTO monthly_costs_new
                    (id, year, month, aws_profile, period_start, period_end, total_cost, unit, synced_at)
                SELECT id, year, month, 'default', period_start, period_end, total_cost, unit, synced_at
                FROM monthly_costs
            """))
            conn.execute(text("DROP TABLE monthly_costs"))
            conn.execute(text("ALTER TABLE monthly_costs_new RENAME TO monthly_costs"))


@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)
    _migrate_db()
    from app.services.auth_service import seed_default_users
    db = SessionLocal()
    try:
        seed_default_users(db)
    finally:
        db.close()


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}


@app.get("/api/profiles", tags=["health"])
def list_aws_profiles():
    """List configured AWS CLI profiles — public, no auth required."""
    import subprocess
    import configparser
    import os

    # Try AWS CLI first
    try:
        result = subprocess.run(
            ["aws", "configure", "list-profiles"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            profiles = [p.strip() for p in result.stdout.splitlines() if p.strip()]
            if profiles:
                return {"configured": sorted(profiles)}
    except Exception:
        pass

    # Fallback: parse config files
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

    return {"configured": sorted(profiles)}
