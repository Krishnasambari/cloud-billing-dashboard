from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.models.user import User, UserCardConfig

SECRET_KEY = "aws-billing-dashboard-secret-key-change-in-prod-2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 hours

# Master list of all toggleable cards — order matters (display order in admin)
ALL_CARDS = [
    {"key": "button_sync",         "label": "Sync from AWS",                   "group": "Actions"},
    {"key": "summary_this_month",  "label": "This Month",                       "group": "Summary Cards"},
    {"key": "summary_last_month",  "label": "Last Month",                       "group": "Summary Cards"},
    {"key": "summary_ytd",         "label": "Year to Date",                     "group": "Summary Cards"},
    {"key": "summary_mom",         "label": "MoM Change (with $ diff)",         "group": "Summary Cards"},
    {"key": "summary_forecast",    "label": "Forecast (Month End)",             "group": "Summary Cards"},
    {"key": "chart_monthly",       "label": "Monthly Spend Chart",              "group": "Charts"},
    {"key": "chart_service",       "label": "Click any bar to drill into services", "group": "Charts"},
    {"key": "page_compare",        "label": "Select months to compare",         "group": "Compare Page"},
    {"key": "feature_add_reason",  "label": "Add Reason (notes on compare)",    "group": "Compare Page"},
]

ALL_CARD_KEYS = {c["key"] for c in ALL_CARDS}


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email, User.is_active == True).first()


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def get_cards_for_user(db: Session, user_id: int) -> dict[str, bool]:
    """Return {card_key: visible} for a user. Missing keys default to True."""
    rows = db.query(UserCardConfig).filter(UserCardConfig.user_id == user_id).all()
    config = {r.card_key: r.visible for r in rows}
    for c in ALL_CARDS:
        if c["key"] not in config:
            config[c["key"]] = True
    return config


def set_cards_for_user(db: Session, user_id: int, card_visibility: dict[str, bool]) -> None:
    """Upsert card visibility for a specific user."""
    for key, visible in card_visibility.items():
        if key not in ALL_CARD_KEYS:
            continue
        existing = db.query(UserCardConfig).filter_by(user_id=user_id, card_key=key).first()
        if existing:
            existing.visible = visible
        else:
            db.add(UserCardConfig(user_id=user_id, card_key=key, visible=visible))
    db.commit()


def seed_default_users(db: Session) -> None:
    """Create default admin + sample users if none exist."""
    if db.query(User).filter_by(role="admin").count() > 0:
        return
    now = datetime.now(timezone.utc).isoformat()
    admin = User(email="admin@company.com", name="Admin", role="admin",
                 job_role="Administration", hashed_password=hash_password("admin123"), created_at=now)
    finance = User(email="finance@company.com", name="Finance User", role="user",
                   job_role="Finance", hashed_password=hash_password("finance123"), created_at=now)
    devops = User(email="devops@company.com", name="DevOps User", role="user",
                  job_role="DevOps", hashed_password=hash_password("devops123"), created_at=now)
    db.add_all([admin, finance, devops])
    db.commit()

    # Finance: no sync button, no add-reason
    set_cards_for_user(db, finance.id, {
        "button_sync": False,
        "summary_this_month": True, "summary_last_month": True,
        "summary_ytd": True, "summary_mom": True,
        "chart_monthly": True, "chart_service": True,
        "page_compare": True, "feature_add_reason": False,
    })
    # DevOps: all cards on
    set_cards_for_user(db, devops.id, {c["key"]: True for c in ALL_CARDS})
