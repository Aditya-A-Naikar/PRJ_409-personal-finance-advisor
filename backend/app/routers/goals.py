from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import require_user
from app.database import get_db
from app.models.goal import FinancialGoal
from app.models.transaction import Transaction
from app.schemas.goal import GoalContribute, GoalCreate, GoalOut
from app.services.financial_calculations import average_monthly_expense
from app.services.goal_engine import compute_goal_metrics

router = APIRouter()


def _disposable_income(db: Session, current_user, exclude_goal_id: int | None = None) -> float:
    """
    Disposable income = income − avg monthly expenses − committed monthly goal targets.
    Excludes the goal being evaluated so we don't double-count its own target.
    """
    transactions = (
        db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    )
    avg_expense = average_monthly_expense(transactions)

    other_goals_q = db.query(FinancialGoal).filter(
        FinancialGoal.user_id == current_user.id
    )
    if exclude_goal_id is not None:
        other_goals_q = other_goals_q.filter(FinancialGoal.id != exclude_goal_id)
    committed = sum(g.monthly_target or 0.0 for g in other_goals_q.all())

    return max(current_user.monthly_income - avg_expense - committed, 0.0)


def _to_out(goal: FinancialGoal, metrics: dict) -> GoalOut:
    return GoalOut(
        id=goal.id,
        name=goal.name,
        target_amount=goal.target_amount,
        current_amount=goal.current_amount,
        target_date=goal.target_date,
        monthly_target=metrics["monthly_target"],
        status=metrics["status"],
        remaining_amount=metrics["remaining_amount"],
        months_remaining=metrics["months_remaining"],
        progress_percentage=metrics["progress_percentage"],
    )


@router.post("", response_model=GoalOut, status_code=201)
def create_goal(
    payload: GoalCreate,
    current_user=Depends(require_user),
    db: Session = Depends(get_db),
):
    if payload.target_amount <= 0:
        raise HTTPException(status_code=400, detail="target_amount must be positive")
    if payload.target_date <= date.today():
        raise HTTPException(status_code=400, detail="target_date must be in the future")
    if payload.current_amount < 0:
        raise HTTPException(status_code=400, detail="current_amount cannot be negative")

    goal = FinancialGoal(
        user_id=current_user.id,
        name=payload.name,
        target_amount=payload.target_amount,
        current_amount=payload.current_amount,
        target_date=payload.target_date,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    disposable = _disposable_income(db, current_user, exclude_goal_id=goal.id)
    metrics = compute_goal_metrics(
        goal.target_amount, goal.current_amount, goal.target_date, disposable
    )
    goal.monthly_target = metrics["monthly_target"]
    goal.status = metrics["status"]
    db.commit()

    return _to_out(goal, metrics)


@router.get("", response_model=list[GoalOut])
def list_goals(
    current_user=Depends(require_user),
    db: Session = Depends(get_db),
):
    goals = db.query(FinancialGoal).filter(FinancialGoal.user_id == current_user.id).all()
    out = []
    for goal in goals:
        disposable = _disposable_income(db, current_user, exclude_goal_id=goal.id)
        metrics = compute_goal_metrics(
            goal.target_amount, goal.current_amount, goal.target_date, disposable
        )
        goal.monthly_target = metrics["monthly_target"]
        goal.status = metrics["status"]
        out.append(_to_out(goal, metrics))
    db.commit()
    return out


@router.patch("/{goal_id}/contribute", response_model=GoalOut)
def contribute(
    goal_id: int,
    payload: GoalContribute,
    current_user=Depends(require_user),
    db: Session = Depends(get_db),
):
    """
    Add a contribution toward a savings goal.
    goal_id is filtered by user_id — IDOR protection: users cannot
    contribute to or discover other users' goals by guessing IDs.
    """
    goal = db.query(FinancialGoal).filter(
        FinancialGoal.id == goal_id,
        FinancialGoal.user_id == current_user.id,
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="amount must be positive")

    goal.current_amount = min(goal.current_amount + payload.amount, goal.target_amount)
    db.commit()

    disposable = _disposable_income(db, current_user, exclude_goal_id=goal.id)
    metrics = compute_goal_metrics(
        goal.target_amount, goal.current_amount, goal.target_date, disposable
    )
    goal.monthly_target = metrics["monthly_target"]
    goal.status = metrics["status"]
    db.commit()

    return _to_out(goal, metrics)


@router.delete("/{goal_id}", status_code=204)
def delete_goal(
    goal_id: int,
    current_user=Depends(require_user),
    db: Session = Depends(get_db),
):
    """Delete a goal. Also user_id-scoped for IDOR protection."""
    goal = db.query(FinancialGoal).filter(
        FinancialGoal.id == goal_id,
        FinancialGoal.user_id == current_user.id,
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()
