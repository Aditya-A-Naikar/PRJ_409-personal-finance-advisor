"""
Goal feasibility calculator (Section 28).
Pure arithmetic — no ML, no LLM.
"""
from datetime import date


def months_between(today: date, target_date: date) -> int:
    """Whole months remaining between today and target_date, minimum 1."""
    months = (target_date.year - today.year) * 12 + (target_date.month - today.month)
    if target_date.day < today.day:
        months -= 1
    return max(months, 1)


def compute_goal_metrics(
    target_amount: float,
    current_amount: float,
    target_date: date,
    disposable_income: float,
    today: date | None = None,
) -> dict:
    """
    Returns a dict with:
        remaining_amount, months_remaining, monthly_target,
        status (feasible | tight | not_feasible), progress_percentage

    Status thresholds:
        feasible     — monthly_target ≤ 50% of disposable income
        tight        — monthly_target ≤ disposable income (but > 50%)
        not_feasible — monthly_target > disposable income (or income ≤ 0)
    """
    today = today or date.today()
    remaining_amount = max(target_amount - current_amount, 0.0)
    months_remaining = months_between(today, target_date)
    monthly_target = round(remaining_amount / months_remaining, 2)

    if disposable_income <= 0:
        status = "not_feasible"
    elif monthly_target <= disposable_income * 0.5:
        status = "feasible"
    elif monthly_target <= disposable_income:
        status = "tight"
    else:
        status = "not_feasible"

    progress_pct = (
        round((current_amount / target_amount) * 100, 1) if target_amount > 0 else 0.0
    )

    return {
        "remaining_amount": round(remaining_amount, 2),
        "months_remaining": months_remaining,
        "monthly_target": monthly_target,
        "status": status,
        "progress_percentage": progress_pct,
    }
