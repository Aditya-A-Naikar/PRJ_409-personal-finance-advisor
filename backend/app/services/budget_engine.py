"""
Deterministic budget recommendation engine (Section 27).

Recommended amount per category = average of that category's spend across
all PRIOR months (i.e. every month except the most recent).
Actual amount = current month's spend in that category.

No LLM involved — arithmetic only, per Section 27's explicit instruction.
"""
from app.services.financial_calculations import monthly_category_totals, latest_month_key

# Below this fraction of recommended, we call it "under" (e.g. 0.7 = under if < 70% of recommended)
UNDER_THRESHOLD = 0.70


def generate_budget(transactions) -> tuple:
    """
    Returns:
        (current_month: str | None,
         items: list[dict])

    Each item dict has:
        category, recommended_amount, actual_amount, remaining_amount, status
    """
    cat_totals = monthly_category_totals(transactions)
    current_month = latest_month_key(transactions)
    if current_month is None:
        return None, []

    history_months = sorted(m for m in cat_totals if m != current_month)
    all_categories = sorted({cat for cats in cat_totals.values() for cat in cats})

    results = []
    for category in all_categories:
        history_values = [cat_totals.get(m, {}).get(category, 0.0) for m in history_months]
        recommended = (
            round(sum(history_values) / len(history_values), 2)
            if history_values else 0.0
        )
        actual = round(cat_totals.get(current_month, {}).get(category, 0.0), 2)
        remaining = round(recommended - actual, 2)

        if recommended == 0 and actual > 0:
            # Brand-new spending — no prior baseline to compare against
            status = "overspending"
        elif actual > recommended:
            status = "overspending"
        elif recommended > 0 and actual < UNDER_THRESHOLD * recommended:
            status = "under"
        else:
            status = "on_track"

        results.append({
            "category": category,
            "recommended_amount": recommended,
            "actual_amount": actual,
            "remaining_amount": remaining,
            "status": status,
        })

    return current_month, results
