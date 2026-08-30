from typing import Optional

from pydantic import BaseModel


class BudgetItemOut(BaseModel):
    category: str
    recommended_amount: float
    actual_amount: float
    remaining_amount: float
    status: str  # "overspending" | "on_track" | "under"


class BudgetResponse(BaseModel):
    month: Optional[str] = None  # "2026-08"
    items: list[BudgetItemOut]
