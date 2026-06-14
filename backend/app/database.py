import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings

# Resolve DB path relative to this file's location
_base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_db_path = os.path.normpath(os.path.join(_base_dir, settings.DB_PATH))

# Choose database URL: MySQL if provided, else fallback to SQLite
if settings.MYSQL_URL:
    DATABASE_URL = settings.MYSQL_URL
    engine = create_engine(DATABASE_URL)
else:
    # Ensure directory exists for SQLite file
    os.makedirs(os.path.dirname(_db_path), exist_ok=True)
    DATABASE_URL = f"sqlite:///{_db_path}"
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
