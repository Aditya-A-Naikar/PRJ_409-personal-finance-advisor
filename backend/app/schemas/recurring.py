from typing import Optional

from pydantic import BaseModel


class RecurringExpenseOut(BaseModel):
    id: int
    merchant: str
    category: Optional[str] = None
    average_amount: float
    latest_amount: float
    change_percentage: float
    frequency: str
    drift_score: float
    status: str
    severity: str    # computed at read time via compute_severity() — not a DB column
    explanation: str  # human-readable summary for the frontend card


class AnalyzeSummary(BaseModel):
    merchants_analyzed: int
    recurring_found: int
    increasing: int
    new: int
    stable: int
