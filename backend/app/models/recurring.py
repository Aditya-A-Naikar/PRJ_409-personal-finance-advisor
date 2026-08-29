from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class RecurringExpense(Base):
    __tablename__ = "recurring_expenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    merchant = Column(String, nullable=False)
    category = Column(String)
    average_amount = Column(Float)
    latest_amount = Column(Float)
    change_percentage = Column(Float)
    frequency = Column(String)              # "monthly" | "weekly" | etc.
    drift_score = Column(Float)             # significance of the price increase
    status = Column(String, default="stable")  # "stable" | "increasing" | "new"

    user = relationship("User", back_populates="recurring_expenses")
