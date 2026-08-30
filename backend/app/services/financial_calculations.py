"""
Shared calculation helpers used by budget, goal, and affordability engines.
Pure Python — no ML, no LLM calls (Section 27's explicit rule).
"""
from collections import defaultdict
from datetime import datetime
from typing import Optional


def _month_key(dt: datetime) -> str:
    """'2026-08' from a datetime object."""
    return f"{dt.year:04d}-{dt.month:02d}"


def monthly_expense_totals(transactions) -> dict[str, float]:
    """Total expense spend per calendar month: {'2026-07': 28450.0, ...}"""
    totals: dict[str, float] = defaultdict(float)
    for t in transactions:
        if t.transaction_type == "expense":
            totals[_month_key(t.date)] += t.amount
    return dict(totals)


def monthly_category_totals(transactions) -> dict[str, dict[str, float]]:
    """Per-category spend per month: {'2026-07': {'Food': 4200, 'Rent': 15000, ...}, ...}"""
    totals: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for t in transactions:
        if t.transaction_type == "expense":
            totals[_month_key(t.date)][t.category] += t.amount
    return {m: dict(cats) for m, cats in totals.items()}


def latest_month_key(transactions) -> Optional[str]:
    """The most recent month that has expense transactions."""
    months = {_month_key(t.date) for t in transactions if t.transaction_type == "expense"}
    return max(months) if months else None


def average_monthly_expense(transactions, exclude_month: Optional[str] = None) -> float:
    """Mean monthly total expense spend, optionally skipping one month."""
    totals = monthly_expense_totals(transactions)
    if exclude_month:
        totals = {m: v for m, v in totals.items() if m != exclude_month}
    return sum(totals.values()) / len(totals) if totals else 0.0
