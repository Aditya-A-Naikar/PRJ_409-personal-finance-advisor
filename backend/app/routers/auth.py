from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.security import create_access_token, hash_password, verify_password
from app.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.schemas.user import TokenResponse, UserIncomeUpdate, UserLogin, UserOut, UserRegister

router = APIRouter()


def _generate_user_id(db: Session) -> str:
    count = db.query(User).count()
    return f"USER{count + 1:03d}"  # USER001, USER002, ...


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user = User(
        user_id=_generate_user_id(db),
        name=payload.name,
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="USER",      # hard-coded — nobody can self-register as ADMIN
        status="active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.user_id, "role": "USER"})
    return TokenResponse(access_token=token, role="USER", user=user)


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if user.status != "active":
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = create_access_token({"sub": user.user_id, "role": "USER"})
    return TokenResponse(access_token=token, role="USER", user=user)


@router.get("/me", response_model=UserOut)
def get_me(current=Depends(get_current_user)):
    if isinstance(current, dict):
        raise HTTPException(status_code=400, detail="Admin has no user profile")
    return current


@router.patch("/me", response_model=UserOut)
def update_income(
    payload: UserIncomeUpdate,
    current=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Let a user update their monthly income so budget/goal/affordability
    calculations have a realistic baseline."""
    if isinstance(current, dict):
        raise HTTPException(status_code=400, detail="Admin has no user profile")
    if payload.monthly_income < 0:
        raise HTTPException(status_code=400, detail="monthly_income cannot be negative")
    current.monthly_income = payload.monthly_income

    # Synchronize the latest salary transaction so transaction history matches the updated income
    latest_salary = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current.id,
            Transaction.transaction_type == "income",
        )
        .order_by(Transaction.date.desc())
        .first()
    )
    if latest_salary:
        latest_salary.amount = payload.monthly_income

    db.commit()
    db.refresh(current)
    return current
