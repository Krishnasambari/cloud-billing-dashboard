from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.services.auth_service import (
    hash_password, decode_token,
    get_cards_for_user, set_cards_for_user, ALL_CARDS
)

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    user = db.query(User).filter_by(id=int(payload["sub"]), is_active=True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ── Schemas ───────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: int
    email: str
    name: str
    role: str
    job_role: str
    is_active: bool
    created_at: str
    class Config:
        from_attributes = True


class CreateUserRequest(BaseModel):
    email: str
    name: str
    password: str
    job_role: str = "General"


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    job_role: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


class CardItem(BaseModel):
    key: str
    label: str
    group: str
    visible: bool


class UserCardsOut(BaseModel):
    user_id: int
    cards: list[CardItem]


class SetUserCardsRequest(BaseModel):
    cards: dict[str, bool]


# ── User CRUD ─────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserOut])
def list_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(User).filter(User.role != "admin").order_by(User.created_at).all()


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(body: CreateUserRequest, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(User).filter_by(email=body.email.strip().lower()).first():
        raise HTTPException(status_code=409, detail="Email already exists")
    now = datetime.now(timezone.utc).isoformat()
    user = User(
        email=body.email.strip().lower(),
        name=body.name.strip(),
        role="user",
        job_role=body.job_role.strip(),
        hashed_password=hash_password(body.password),
        created_at=now,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, body: UpdateUserRequest, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter_by(id=user_id).first()
    if not user or user.role == "admin":
        raise HTTPException(status_code=404, detail="User not found")
    if body.name is not None:
        user.name = body.name.strip()
    if body.email is not None:
        user.email = body.email.strip().lower()
    if body.job_role is not None:
        user.job_role = body.job_role.strip()
    if body.password:
        user.hashed_password = hash_password(body.password)
    if body.is_active is not None:
        user.is_active = body.is_active
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter_by(id=user_id).first()
    if not user or user.role == "admin":
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()


# ── Per-user card config ──────────────────────────────────────────────────────

@router.get("/users/{user_id}/cards", response_model=UserCardsOut)
def get_user_cards(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter_by(id=user_id).first()
    if not user or user.role == "admin":
        raise HTTPException(status_code=404, detail="User not found")
    cfg = get_cards_for_user(db, user_id)
    cards = [CardItem(key=c["key"], label=c["label"], group=c["group"], visible=cfg[c["key"]]) for c in ALL_CARDS]
    return UserCardsOut(user_id=user_id, cards=cards)


@router.put("/users/{user_id}/cards", response_model=UserCardsOut)
def set_user_cards(user_id: int, body: SetUserCardsRequest, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter_by(id=user_id).first()
    if not user or user.role == "admin":
        raise HTTPException(status_code=404, detail="User not found")
    set_cards_for_user(db, user_id, body.cards)
    cfg = get_cards_for_user(db, user_id)
    cards = [CardItem(key=c["key"], label=c["label"], group=c["group"], visible=cfg[c["key"]]) for c in ALL_CARDS]
    return UserCardsOut(user_id=user_id, cards=cards)


# ── Card definitions ──────────────────────────────────────────────────────────

@router.get("/cards")
def get_card_definitions():
    return {"cards": ALL_CARDS}
