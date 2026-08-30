"""
Recurring Cost Drift Detector — AI Component #2.

Groups a user's expense transactions by merchant, decides which merchants
are genuinely recurring (regular time gaps, not just repeated by chance),
then computes a drift score describing whether the cost is stable,
increasing, or newly recurring.

Methodology note (important for viva honesty):
  This is a statistical/rule-based detector using standard Python statistics.
  It is NOT a deep-learning or RNN concept-drift model, even though the
  literature review that inspired it (Saurav et al. 2018, Liu et al. 2023)
  uses such methods. We are transparent about this everywhere the feature is
  described.

  The baseline for change_percentage is the mean of ALL prior occurrences
  (not just the first price), which is the more statistically defensible
  approach per Liu et al. 2023 — fluctuation-rate features over a rolling
  baseline rather than a single reference point.
"""
import statistics
from datetime import datetime

# ── Tuning constants ────────────────────────────────────────────────────────
CONSISTENCY_THRESHOLD = 0.5    # gap CoV must be below this to call it "recurring"
INCREASE_THRESHOLD_PCT = 15.0  # minimum % change to label status "increasing"
NEW_RECENCY_FRACTION = 0.5     # first occurrence must be in the 2nd half of the window
NEW_MAX_OCCURRENCES = 3        # and not have repeated many times yet


# ── Helpers ─────────────────────────────────────────────────────────────────

def _classify_frequency(mean_gap_days: float) -> str:
    if 5 <= mean_gap_days <= 9:
        return "weekly"
    if 25 <= mean_gap_days <= 35:
        return "monthly"
    if 85 <= mean_gap_days <= 100:
        return "quarterly"
    return "irregular"


def compute_severity(drift_score: float, status: str) -> str:
    """
    Derived display field — computed at read time, never stored.
    Tells the frontend how prominently to highlight this item.
    """
    if status != "increasing":
        return "Low"
    if drift_score >= 0.5:
        return "High"
    if drift_score >= 0.25:
        return "Medium"
    return "Low"


def _analyze_merchant_group(
    merchant: str,
    category: str,
    dates: list[datetime],
    amounts: list[float],
) -> dict | None:
    """
    Returns an analysis dict for one merchant's sorted transaction history,
    or None if the merchant fails the consistency/regularity gate.
    """
    count = len(dates)
    if count < 2:
        return None  # need ≥2 occurrences to infer any pattern

    gaps = [(dates[i + 1] - dates[i]).days for i in range(count - 1)]
    mean_gap = statistics.mean(gaps)
    std_gap = statistics.pstdev(gaps) if len(gaps) > 1 else 0.0

    # Consistency: 1 means perfectly regular, 0 means completely random.
    # Coefficient of Variation (std/mean) penalises erratic gaps.
    consistency = max(0.0, 1.0 - (std_gap / mean_gap)) if mean_gap > 0 else 0.0

    if consistency < CONSISTENCY_THRESHOLD:
        return None  # too irregular — random food/transport orders are filtered here

    frequency = _classify_frequency(mean_gap)

    # Baseline = average of all prices EXCEPT the latest
    latest_amount = amounts[-1]
    baseline_amounts = amounts[:-1]
    baseline_avg = statistics.mean(baseline_amounts)
    change_pct = (
        (latest_amount - baseline_avg) / baseline_avg * 100
        if baseline_avg > 0 else 0.0
    )

    # Check for monotonic upward trend in the last ≤3 data points
    recent = amounts[-3:] if count >= 3 else amounts
    is_monotonic_increase = (
        all(recent[i] <= recent[i + 1] for i in range(len(recent) - 1))
        and recent[-1] > recent[0]
    )

    # Drift score: only penalise if both magnitude AND monotonic trend are present.
    # Without a monotonic trend, high magnitude is just "noisy variance" — cap it low
    # so non-trending merchants don't look alarming in the UI.
    if is_monotonic_increase:
        magnitude = min(abs(change_pct) / 100, 1.0)
        drift_score = round(min(1.0, magnitude * 0.7 + consistency * 0.1 + 0.2), 3)
    else:
        # Stable/noisy: small base score proportional to consistency only
        drift_score = round(min(0.2, consistency * 0.1), 3)

    return {
        "merchant": merchant,
        "category": category,
        "average_amount": round(baseline_avg, 2),
        "latest_amount": round(latest_amount, 2),
        "change_percentage": round(change_pct, 2),
        "frequency": frequency,
        "drift_score": drift_score,
        "count": count,
        "first_date": dates[0],
        "change_pct_raw": change_pct,
        "is_monotonic_increase": is_monotonic_increase,
    }


# ── Public API ───────────────────────────────────────────────────────────────

def detect_recurring_expenses(transactions: list) -> list[dict]:
    """
    Main entry point.

    Args:
        transactions: list of Transaction ORM objects for ONE user.

    Returns:
        list of dicts, each ready to be stored as a RecurringExpense row.
        Only expense-type transactions are considered; income is ignored.
        Merchants that fail the consistency gate are silently excluded.
    """
    expense_txns = [t for t in transactions if t.transaction_type == "expense"]
    if not expense_txns:
        return []

    # Dataset time span — needed to judge whether a merchant is "new"
    all_dates = [t.date for t in expense_txns]
    dataset_start = min(all_dates)
    dataset_end = max(all_dates)
    dataset_span = max((dataset_end - dataset_start).days, 1)

    # Group by merchant
    groups: dict[str, list] = {}
    for t in expense_txns:
        groups.setdefault(t.merchant, []).append(t)

    results = []
    for merchant, group in groups.items():
        group.sort(key=lambda t: t.date)
        dates = [t.date for t in group]
        amounts = [t.amount for t in group]
        category = group[-1].category  # use most recent category label

        analysis = _analyze_merchant_group(merchant, category, dates, amounts)
        if analysis is None:
            continue  # failed consistency gate — correctly excluded

        # "New" = started late in the observation window AND hasn't been seen many times
        offset_fraction = (analysis["first_date"] - dataset_start).days / dataset_span
        is_new = (
            offset_fraction >= NEW_RECENCY_FRACTION
            and analysis["count"] <= NEW_MAX_OCCURRENCES
        )

        if is_new:
            status = "new"
        elif (
            analysis["change_pct_raw"] >= INCREASE_THRESHOLD_PCT
            and analysis["is_monotonic_increase"]
        ):
            status = "increasing"
        else:
            status = "stable"

        results.append({
            "merchant": analysis["merchant"],
            "category": analysis["category"],
            "average_amount": analysis["average_amount"],
            "latest_amount": analysis["latest_amount"],
            "change_percentage": analysis["change_percentage"],
            "frequency": analysis["frequency"],
            "drift_score": analysis["drift_score"],
            "status": status,
        })

    return results
