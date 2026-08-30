from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_user
from app.database import get_db
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.schemas.budget import BudgetItemOut, BudgetResponse
from app.services.budget_engine import generate_budget

router = APIRouter()


@router.post("/generate", response_model=BudgetResponse)
def generate(
    current_user=Depends(require_user),
    db: Session = Depends(get_db),
):
    """
    (Re)compute budget recommendations from the user's transaction history
    and persist the results. Safe to call repeatedly — replaces existing
    rows for the current month rather than appending.
    """
    transactions = (
        db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    )
    month, items = generate_budget(transactions)

    if month and items:
        # Delete-and-rebuild for the current month — keeps prior months intact
        db.query(Budget).filter(
            Budget.user_id == current_user.id, Budget.month == month
        ).delete()
        for item in items:
            db.add(Budget(
                user_id=current_user.id,
                month=month,
                category=item["category"],
                recommended_amount=item["recommended_amount"],
                actual_amount=item["actual_amount"],
                status=item["status"],
            ))
        db.commit()

    return BudgetResponse(
        month=month,
        items=[BudgetItemOut(**i) for i in items],
    )


@router.get("", response_model=BudgetResponse)
def get_budget(
    current_user=Depends(require_user),
    db: Session = Depends(get_db),
):
    """Return the most recently generated budget for this user."""
    rows = (
        db.query(Budget).filter(Budget.user_id == current_user.id).all()
    )
    if not rows:
        return BudgetResponse(month=None, items=[])

    # All rows for a user share the same current month (we only store one month at a time)
    month = max(r.month for r in rows)
    items = [
        BudgetItemOut(
            category=r.category,
            recommended_amount=r.recommended_amount,
            actual_amount=r.actual_amount,
            remaining_amount=round(r.recommended_amount - r.actual_amount, 2),
            status=r.status,
        )
        for r in rows
        if r.month == month
    ]
    return BudgetResponse(month=month, items=items)
