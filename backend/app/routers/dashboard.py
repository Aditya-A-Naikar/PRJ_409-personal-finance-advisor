from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_user
from app.database import get_db
from app.models.goal import FinancialGoal
from app.models.transaction import Transaction
from app.schemas.dashboard import (
    BudgetSummary,
    CategoryAmount,
    DashboardResponse,
    GoalSummary,
    MonthTrend,
    RecurringAlert,
)
from app.services.budget_engine import generate_budget
from app.services.financial_calculations import (
    latest_month_key,
    monthly_category_totals,
    monthly_expense_totals,
)
from app.services.goal_engine import compute_goal_metrics
from app.services.insights import generate_insights
from app.services.recurring_detector import compute_severity, detect_recurring_expenses

router = APIRouter()


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    current_user=Depends(require_user),
    db: Session = Depends(get_db),
):
    """
    Single aggregation endpoint that powers all dashboard widgets.
    Everything is computed live from raw Transaction rows (at demo scale this
    is fast enough to not need caching) so the dashboard is never out of sync
    with stored Budget / RecurringExpense tables.
    """
    transactions = (
        db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    )

    # ── Totals ──────────────────────────────────────────────────────────────
    total_income = sum(t.amount for t in transactions if t.transaction_type == "income")
    total_expense = sum(t.amount for t in transactions if t.transaction_type == "expense")
    total_balance = round(total_income - total_expense, 2)

    current_month = latest_month_key(transactions)
    cat_totals = monthly_category_totals(transactions)
    expense_totals = monthly_expense_totals(transactions)

    income_totals: dict[str, float] = {}
    for t in transactions:
        if t.transaction_type == "income":
            key = f"{t.date.year:04d}-{t.date.month:02d}"
            income_totals[key] = income_totals.get(key, 0.0) + t.amount

    monthly_income = round(income_totals.get(current_month, 0.0), 2) if current_month else 0.0
    monthly_expenses = round(expense_totals.get(current_month, 0.0), 2) if current_month else 0.0
    savings = round(monthly_income - monthly_expenses, 2)

    # ── Category breakdown (current month, sorted by amount desc) ──────────
    category_breakdown = [
        CategoryAmount(category=cat, amount=round(amt, 2))
        for cat, amt in sorted(
            cat_totals.get(current_month, {}).items(), key=lambda x: -x[1]
        )
    ] if current_month else []

    # ── Monthly income vs expenses trend ────────────────────────────────────
    all_months = sorted(set(expense_totals) | set(income_totals))
    monthly_trend = [
        MonthTrend(
            month=m,
            income=round(income_totals.get(m, 0.0), 2),
            expenses=round(expense_totals.get(m, 0.0), 2),
        )
        for m in all_months
    ]

    # ── Recurring alerts (increasing + new, top 5 by drift_score) ──────────
    recurring_items = detect_recurring_expenses(transactions)
    notable = sorted(
        (r for r in recurring_items if r["status"] in ("increasing", "new")),
        key=lambda r: r["drift_score"],
        reverse=True,
    )
    recurring_alerts = [
        RecurringAlert(
            merchant=r["merchant"],
            status=r["status"],
            change_percentage=r["change_percentage"],
            latest_amount=r["latest_amount"],
            severity=compute_severity(r["drift_score"], r["status"]),
        )
        for r in notable[:5]
    ]

    # ── Budget status (overspending first, top 6) ───────────────────────────
    _, budget_items = generate_budget(transactions)
    budget_sorted = sorted(
        budget_items, key=lambda b: (b["status"] != "overspending", b["category"])
    )
    budget_status = [
        BudgetSummary(
            category=b["category"],
            recommended_amount=b["recommended_amount"],
            actual_amount=b["actual_amount"],
            status=b["status"],
        )
        for b in budget_sorted[:6]
    ]

    # ── Goal summaries ──────────────────────────────────────────────────────
    goals_db = db.query(FinancialGoal).filter(
        FinancialGoal.user_id == current_user.id
    ).all()
    goal_summaries = []
    for g in goals_db:
        disposable = max(current_user.monthly_income - monthly_expenses, 0.0)
        metrics = compute_goal_metrics(
            g.target_amount, g.current_amount, g.target_date, disposable
        )
        goal_summaries.append(GoalSummary(
            id=g.id,
            name=g.name,
            progress_percentage=metrics["progress_percentage"],
            monthly_target=metrics["monthly_target"],
            status=metrics["status"],
        ))

    # ── Rule-based insights (NOT Gemini — see services/insights.py) ─────────
    insights = generate_insights(transactions, recurring_items, budget_items)

    return DashboardResponse(
        month=current_month,
        total_balance=total_balance,
        monthly_income=monthly_income,
        monthly_expenses=monthly_expenses,
        savings=savings,
        category_breakdown=category_breakdown,
        monthly_trend=monthly_trend,
        recurring_alerts=recurring_alerts,
        goals=goal_summaries,
        budget_status=budget_status,
        insights=insights,
    )
