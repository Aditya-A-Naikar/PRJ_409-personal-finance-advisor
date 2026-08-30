from datetime import date

from pydantic import BaseModel


class GoalCreate(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0.0
    target_date: date


class GoalContribute(BaseModel):
    amount: float


class GoalOut(BaseModel):
    id: int
    name: str
    target_amount: float
    current_amount: float
    target_date: date
    monthly_target: float
    status: str            # "feasible" | "tight" | "not_feasible"
    remaining_amount: float
    months_remaining: int
    progress_percentage: float
