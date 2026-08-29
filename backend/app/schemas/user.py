from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class UserRegister(BaseModel):
    name: str
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class AdminLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    name: str
    username: str
    email: EmailStr
    role: str
    status: str
    monthly_income: float
    monthly_budget: float
    created_at: datetime
    # password_hash is intentionally absent — can never leak through this schema


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user: Optional[UserOut] = None
