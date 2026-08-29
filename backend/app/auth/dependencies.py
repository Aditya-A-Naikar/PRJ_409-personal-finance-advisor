from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.security import decode_access_token
from app.database import get_db
from app.models.user import User

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    """
    Decodes the JWT and returns EITHER:
      - a dict {"role": "ADMIN", "username": "..."} for the admin (no DB row), or
      - a User ORM object for a normal user.
    This is the ONLY source of truth for "who is making this request."
    The frontend can never override this by sending a user_id in the request body.
    """
    payload = decode_access_token(credentials.credentials)
    role = payload.get("role")
    subject = payload.get("sub")

    if role == "ADMIN":
        return {"role": "ADMIN", "username": subject}

    user = db.query(User).filter(User.user_id == subject).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
    return user


def require_user(current=Depends(get_current_user)):
    """Dependency for every USER-facing endpoint (transactions, budgets, goals, etc.)."""
    role = current.role if hasattr(current, "role") else current.get("role")
    if role != "USER":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User access required")
    return current


def require_admin(current=Depends(get_current_user)):
    """Dependency for every ADMIN-facing endpoint."""
    role = current["role"] if isinstance(current, dict) else current.role
    if role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current
