from datetime import date
from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class FinancialGoal(Base):
    __tablename__ = "financial_goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    name = Column(String, nullable=False)           # e.g. "New Car"
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0)
    target_date = Column(Date)
    monthly_target = Column(Float, default=0)       # calculated, not user-entered
    status = Column(String, default="on_track")     # "feasible" | "tight" | "not_feasible"

    user = relationship("User", back_populates="goals")
