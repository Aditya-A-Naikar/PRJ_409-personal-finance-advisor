# Import all models here so Base.metadata knows about every table
# when init_db.py calls Base.metadata.create_all().
# Missing an import here = that table silently never gets created.
from app.models.user import User
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.goal import FinancialGoal
from app.models.recurring import RecurringExpense
from app.models.chat import ChatHistory

__all__ = [
    "User",
    "Transaction",
    "Budget",
    "FinancialGoal",
    "RecurringExpense",
    "ChatHistory",
]
