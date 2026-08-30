from typing import Optional

from pydantic import BaseModel


class CategoryAmount(BaseModel):
    category: str
    amount: float


class MonthTrend(BaseModel):
    month: str
    income: float
    expenses: float


class RecurringAlert(BaseModel):
    merchant: str
    status: str
    change_percentage: float
    latest_amount: float
    severity: str


class GoalSummary(BaseModel):
    id: int
    name: str
    progress_percentage: float
    monthly_target: float
    status: str


class BudgetSummary(BaseModel):
    category: str
    recommended_amount: float
    actual_amount: float
    status: str


class DashboardResponse(BaseModel):
    month: Optional[str] = None
    total_balance: float
    monthly_income: float
    monthly_expenses: float
    savings: float
    category_breakdown: list[CategoryAmount]
    monthly_trend: list[MonthTrend]
    recurring_alerts: list[RecurringAlert]
    goals: list[GoalSummary]
    budget_status: list[BudgetSummary]
    insights: list[str]
