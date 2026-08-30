from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class TransactionCreate(BaseModel):
    date: date
    description: str
    amount: float
    transaction_type: str           # "income" | "expense"
    merchant: Optional[str] = None  # if omitted, derived from description via normalizer


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: datetime
    description: str
    merchant: str
    amount: float
    transaction_type: str
    category: str
    confidence: float
    classification_method: str
    source: str
    is_recurring: bool
    recurring_group: Optional[str] = None


class UploadRowError(BaseModel):
    row_number: int
    reason: str


class UploadSummary(BaseModel):
    total_rows: int
    imported: int
    failed: int
    errors: list[UploadRowError] = []
