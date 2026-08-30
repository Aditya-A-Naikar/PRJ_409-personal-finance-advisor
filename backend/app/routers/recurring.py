from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_user
from app.database import get_db
from app.models.recurring import RecurringExpense
from app.models.transaction import Transaction
from app.schemas.recurring import AnalyzeSummary, RecurringExpenseOut
from app.services.recurring_detector import compute_severity, detect_recurring_expenses

router = APIRouter()


def _explanation(item: dict) -> str:
    """
    Plain-English summary for the frontend card.
    Each status gets a distinct message so the UI can show it verbatim.
    """
    if item["status"] == "new":
        freq = item["frequency"].rstrip("ly")  # "monthly" → "month"
        return (
            f"New recurring payment detected: {item['merchant']} — "
            f"₹{item['latest_amount']:.0f}/{freq}."
        )
    if item["status"] == "increasing":
        return (
            f"{item['merchant']} recurring {item['category'] or 'expense'} cost has "
            f"increased {item['change_percentage']:.1f}% over the observed period."
        )
    return f"{item['merchant']} recurring cost is stable."


@router.post("/analyze", response_model=AnalyzeSummary)
def analyze_recurring(
    current_user=Depends(require_user),
    db: Session = Depends(get_db),
):
    """
    (Re)compute recurring expense detection for the authenticated user and
    persist results. Safe to call repeatedly — always deletes and rebuilds
    the user's rows rather than appending, so it stays idempotent.
    """
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .all()
    )
    detected = detect_recurring_expenses(transactions)

    # Full replace: this table is 100% derived data, so clear + rebuild is
    # simpler and safer than diffing individual rows.
    db.query(RecurringExpense).filter(
        RecurringExpense.user_id == current_user.id
    ).delete()

    for item in detected:
        db.add(RecurringExpense(
            user_id=current_user.id,
            merchant=item["merchant"],
            category=item["category"],
            average_amount=item["average_amount"],
            latest_amount=item["latest_amount"],
            change_percentage=item["change_percentage"],
            frequency=item["frequency"],
            drift_score=item["drift_score"],
            status=item["status"],
        ))
    db.commit()

    distinct_expense_merchants = {
        t.merchant
        for t in transactions
        if t.transaction_type == "expense"
    }

    return AnalyzeSummary(
        merchants_analyzed=len(distinct_expense_merchants),
        recurring_found=len(detected),
        increasing=sum(1 for d in detected if d["status"] == "increasing"),
        new=sum(1 for d in detected if d["status"] == "new"),
        stable=sum(1 for d in detected if d["status"] == "stable"),
    )


@router.get("", response_model=list[RecurringExpenseOut])
def list_recurring(
    current_user=Depends(require_user),
    db: Session = Depends(get_db),
):
    """
    Return all detected recurring expenses for the authenticated user,
    sorted by drift_score descending (most notable first).
    Call POST /analyze first to populate this list.
    """
    rows = (
        db.query(RecurringExpense)
        .filter(RecurringExpense.user_id == current_user.id)
        .order_by(RecurringExpense.drift_score.desc())
        .all()
    )

    result = []
    for r in rows:
        item = {
            "merchant": r.merchant,
            "category": r.category,
            "average_amount": r.average_amount,
            "latest_amount": r.latest_amount,
            "change_percentage": r.change_percentage,
            "frequency": r.frequency,
            "drift_score": r.drift_score,
            "status": r.status,
        }
        result.append(RecurringExpenseOut(
            id=r.id,
            merchant=r.merchant,
            category=r.category,
            average_amount=r.average_amount,
            latest_amount=r.latest_amount,
            change_percentage=r.change_percentage,
            frequency=r.frequency,
            drift_score=r.drift_score,
            status=r.status,
            severity=compute_severity(r.drift_score, r.status),
            explanation=_explanation(item),
        ))
    return result
