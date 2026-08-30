from typing import Optional

from pydantic import BaseModel


class AffordabilityRequest(BaseModel):
    item_name: Optional[str] = None
    purchase_amount: float


class SupportingTransaction(BaseModel):
    date: str
    merchant: str
    amount: float
    category: str


class AffordabilityResponse(BaseModel):
    item_name: Optional[str] = None
    purchase_amount: float
    affordable: bool
    current_available: float
    safety_buffer: float
    projected_after_purchase: float
    reason: str
    supporting_transactions: list[SupportingTransaction]
