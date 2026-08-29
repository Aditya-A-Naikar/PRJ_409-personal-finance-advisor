from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    date = Column(DateTime, nullable=False)
    description = Column(String)                    # raw text, e.g. "UPI/123456/Swiggy"
    merchant = Column(String)                        # normalized, e.g. "Swiggy"
    amount = Column(Float, nullable=False)
    transaction_type = Column(String)               # "income" | "expense"
    category = Column(String)                        # e.g. "Food"
    confidence = Column(Float)                       # ML confidence 0–1
    classification_method = Column(String)           # "ML" | "rule"
    source = Column(String, default="manual")        # "manual" | "csv" | "demo"
    is_recurring = Column(Boolean, default=False)
    recurring_group = Column(String, nullable=True)  # links to RecurringExpense.merchant
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="transactions")
