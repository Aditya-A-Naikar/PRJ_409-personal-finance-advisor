"""
Rule-based dashboard insights generator.

Deliberately NOT calling Gemini here — these are plain statistical comparisons
over data already computed in Python (Section 27: deterministic calculations
stay in Python). Gemini-generated natural language explanations are a separate
feature that arrives in Phase 11.

The function is named generate_insights (not ai_insights) to make this
distinction honest and traceable.
"""
from app.services.financial_calculations import monthly_category_totals, latest_month_key

MAX_INSIGHTS = 4


def generate_insights(
    transactions: list,
    recurring_items: list[dict],
    budget_items: list[dict],
) -> list[str]:
    """
    Returns up to MAX_INSIGHTS human-readable observation strings.

    Sources:
      1. Category spend vs. 3-month rolling average (≥15% spike flagged)
      2. Worst increasing recurring cost (Phase 6 output)
      3. Count of overspending budget categories (Phase 7 output)
    """
    insights: list[str] = []

    # ── 1. Category spend spikes ────────────────────────────────────────────
    cat_totals = monthly_category_totals(transactions)
    current = latest_month_key(transactions)

    if current:
        # Compare current month to last 3 prior months
        history_months = sorted(m for m in cat_totals if m != current)[-3:]
        for category, current_amt in cat_totals.get(current, {}).items():
            hist_vals = [
                cat_totals.get(m, {}).get(category, 0.0)
                for m in history_months
            ]
            hist_vals = [v for v in hist_vals if v > 0]
            if not hist_vals:
                continue
            avg = sum(hist_vals) / len(hist_vals)
            if avg <= 0:
                continue
            pct = (current_amt - avg) / avg * 100
            if pct >= 15:
                insights.append(
                    f"Your {category} spending is {pct:.0f}% above your recent average."
                )

    # ── 2. Worst increasing recurring cost ──────────────────────────────────
    increasing = [r for r in recurring_items if r["status"] == "increasing"]
    if increasing:
        top = max(increasing, key=lambda r: r["drift_score"])
        insights.append(
            f"{top['merchant']} cost has increased {top['change_percentage']:.0f}% recently — "
            f"check the Recurring Costs page."
        )

    # ── 3. Budget overspending count ────────────────────────────────────────
    overspending = [b for b in budget_items if b["status"] == "overspending"]
    if overspending:
        label = "category is" if len(overspending) == 1 else "categories are"
        insights.append(
            f"{len(overspending)} budget {label} over the recommended amount this month."
        )

    return insights[:MAX_INSIGHTS]
