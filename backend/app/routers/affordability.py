from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import require_user
from app.database import get_db
from app.models.goal import FinancialGoal
from app.models.transaction import Transaction
from app.schemas.affordability import (
    AffordabilityRequest,
    AffordabilityResponse,
    SupportingTransaction,
)
from app.services.affordability_engine import compute_affordability
from app.services.financial_calculations import average_monthly_expense

router = APIRouter()


@router.post("/check", response_model=AffordabilityResponse)
def check_affordability(
    payload: AffordabilityRequest,
    current_user=Depends(require_user),
    db: Session = Depends(get_db),
):
    """
    Checks whether a one-time purchase is affordable given the user's income,
    average monthly expenses, and committed goal savings targets.
    """
    if payload.purchase_amount <= 0:
        raise HTTPException(status_code=400, detail="purchase_amount must be positive")

    transactions = (
        db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    )
    avg_expense = average_monthly_expense(transactions)

    goals = db.query(FinancialGoal).filter(FinancialGoal.user_id == current_user.id).all()
    planned_savings = sum(g.monthly_target or 0.0 for g in goals)

    result = compute_affordability(
        income=current_user.monthly_income,
        avg_monthly_expense=avg_expense,
        planned_savings=planned_savings,
        purchase_amount=payload.purchase_amount,
    )

    # Show 5 most recent expense transactions as supporting context
    top_expenses = sorted(
        (t for t in transactions if t.transaction_type == "expense"),
        key=lambda t: t.date,
        reverse=True,
    )[:5]

    return AffordabilityResponse(
        item_name=payload.item_name,
        purchase_amount=payload.purchase_amount,
        affordable=result["affordable"],
        current_available=result["current_available"],
        safety_buffer=result["safety_buffer"],
        projected_after_purchase=result["projected_after_purchase"],
        reason=result["reason"],
        supporting_transactions=[
            SupportingTransaction(
                date=t.date.date().isoformat(),
                merchant=t.merchant,
                amount=t.amount,
                category=t.category,
            )
            for t in top_expenses
        ],
    )
