import secrets

from fastapi import APIRouter, HTTPException

from app.auth.security import create_access_token
from app.config import settings
from app.schemas.user import AdminLogin, TokenResponse

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def admin_login(payload: AdminLogin):
    # secrets.compare_digest avoids timing-attack leakage on the password comparison
    valid_username = secrets.compare_digest(payload.username, settings.ADMIN_USERNAME)
    valid_password = secrets.compare_digest(payload.password, settings.ADMIN_PASSWORD)

    if not (valid_username and valid_password):
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    token = create_access_token({"sub": "admin", "role": "ADMIN"})
    return TokenResponse(access_token=token, role="ADMIN", user=None)
