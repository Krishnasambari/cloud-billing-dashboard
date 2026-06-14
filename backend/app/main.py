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
    title="Cloud Billing Dashboard",
    version="2.0.0",
    description="API for syncing and visualizing multi-cloud cost data",
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

    # ── Phase 1: add aws_profile to service_notes (legacy) ───────────────────
    if "service_notes" in inspector.get_table_names():
        note_cols = [c["name"] for c in inspector.get_columns("service_notes")]
        if "filter_name" not in note_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE service_notes ADD COLUMN filter_name VARCHAR(20)"))
            note_cols = [c["name"] for c in inspector.get_columns("service_notes")]
        if "aws_profile" not in note_cols:
            with engine.begin() as conn:
                conn.execute(text("""
                    CREATE TABLE service_notes_new (
                        id            INTEGER PRIMARY KEY AUTOINCREMENT,
                        year          INTEGER      NOT NULL,
                        month         INTEGER      NOT NULL,
                        service_name  VARCHAR(200) NOT NULL,
                        note          TEXT         NOT NULL,
                        note_date     VARCHAR(10)  NOT NULL,
                        resource_id   VARCHAR(500),
                        resource_name VARCHAR(500),
                        filter_name   VARCHAR(20),
                        aws_profile   VARCHAR(100) NOT NULL DEFAULT 'default',
                        created_at    VARCHAR(30)  NOT NULL,
                        UNIQUE (year, month, service_name, aws_profile)
                    )
                """))
                conn.execute(text("""
                    INSERT INTO service_notes_new
                        (id, year, month, service_name, note, note_date,
                         resource_id, resource_name, filter_name, aws_profile, created_at)
                    SELECT id, year, month, service_name, note, note_date,
                           resource_id, resource_name, filter_name, 'default', created_at
                    FROM service_notes
                """))
                conn.execute(text("DROP TABLE service_notes"))
                conn.execute(text("ALTER TABLE service_notes_new RENAME TO service_notes"))
            note_cols = [c["name"] for c in inspector.get_columns("service_notes")]

    # ── Phase 2: add aws_profile to monthly_costs (legacy) ───────────────────
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
        cols = [c["name"] for c in inspector.get_columns("monthly_costs")]

    # ── Phase 3: add cloud + cloud_account to monthly_costs ──────────────────
    cols = [c["name"] for c in inspector.get_columns("monthly_costs")]
    if "cloud" not in cols:
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE monthly_costs_new (
                    id            INTEGER PRIMARY KEY AUTOINCREMENT,
                    year          INTEGER      NOT NULL,
                    month         INTEGER      NOT NULL,
                    cloud         VARCHAR(20)  NOT NULL DEFAULT 'aws',
                    cloud_account VARCHAR(200) NOT NULL DEFAULT 'default',
                    aws_profile   VARCHAR(100) NOT NULL DEFAULT 'default',
                    period_start  VARCHAR(10)  NOT NULL,
                    period_end    VARCHAR(10)  NOT NULL,
                    total_cost    FLOAT        NOT NULL,
                    unit          VARCHAR(10)  NOT NULL DEFAULT 'USD',
                    synced_at     VARCHAR(30)  NOT NULL,
                    UNIQUE (year, month, cloud, cloud_account)
                )
            """))
            conn.execute(text("""
                INSERT INTO monthly_costs_new
                    (id, year, month, cloud, cloud_account, aws_profile,
                     period_start, period_end, total_cost, unit, synced_at)
                SELECT id, year, month, 'aws', aws_profile, aws_profile,
                       period_start, period_end, total_cost, unit, synced_at
                FROM monthly_costs
            """))
            conn.execute(text("DROP TABLE monthly_costs"))
            conn.execute(text("ALTER TABLE monthly_costs_new RENAME TO monthly_costs"))

    # ── Phase 4: add cloud + cloud_account to service_notes ──────────────────
    if "service_notes" in inspector.get_table_names():
        note_cols = [c["name"] for c in inspector.get_columns("service_notes")]
        if "cloud" not in note_cols:
            with engine.begin() as conn:
                conn.execute(text("""
                    CREATE TABLE service_notes_new (
                        id            INTEGER PRIMARY KEY AUTOINCREMENT,
                        year          INTEGER      NOT NULL,
                        month         INTEGER      NOT NULL,
                        service_name  VARCHAR(200) NOT NULL,
                        note          TEXT         NOT NULL,
                        note_date     VARCHAR(10)  NOT NULL,
                        resource_id   VARCHAR(500),
                        resource_name VARCHAR(500),
                        filter_name   VARCHAR(20),
                        aws_profile   VARCHAR(100) NOT NULL DEFAULT 'default',
                        cloud         VARCHAR(20)  NOT NULL DEFAULT 'aws',
                        cloud_account VARCHAR(200) NOT NULL DEFAULT 'default',
                        created_at    VARCHAR(30)  NOT NULL,
                        UNIQUE (year, month, service_name, cloud, cloud_account)
                    )
                """))
                conn.execute(text("""
                    INSERT INTO service_notes_new
                        (id, year, month, service_name, note, note_date,
                         resource_id, resource_name, filter_name, aws_profile,
                         cloud, cloud_account, created_at)
                    SELECT id, year, month, service_name, note, note_date,
                           resource_id, resource_name, filter_name, aws_profile,
                           'aws', aws_profile, created_at
                    FROM service_notes
                """))
                conn.execute(text("DROP TABLE service_notes"))
                conn.execute(text("ALTER TABLE service_notes_new RENAME TO service_notes"))

    # ── Phase 5: add cloud + cloud_account to sync_logs ──────────────────────
    if "sync_logs" in inspector.get_table_names():
        log_cols = [c["name"] for c in inspector.get_columns("sync_logs")]
        if "cloud" not in log_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE sync_logs ADD COLUMN cloud VARCHAR(20) NOT NULL DEFAULT 'aws'"))
                conn.execute(text("ALTER TABLE sync_logs ADD COLUMN cloud_account VARCHAR(200) NOT NULL DEFAULT 'default'"))
                # backfill from aws_profile if it exists
                if "aws_profile" in log_cols:
                    conn.execute(text("UPDATE sync_logs SET cloud_account = COALESCE(aws_profile, 'default')"))


@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)
    _migrate_db()
    from app.services.auth_service import seed_default_users
    from app.services.profile_watcher import ProfileWatcher
    import asyncio
    db = SessionLocal()
    try:
        seed_default_users(db)
    finally:
        db.close()
    # Start background profile watcher
    watcher = ProfileWatcher()
    asyncio.create_task(watcher.run_periodic_check())


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}


@app.get("/api/profiles", tags=["health"])
def list_aws_profiles():
    """Legacy endpoint — list configured AWS CLI profiles, public no auth required."""
    from app.services.billing_service import list_configured_profiles
    profiles = list_configured_profiles()
    return {"configured": profiles}
