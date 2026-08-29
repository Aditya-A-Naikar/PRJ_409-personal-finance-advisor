from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    month = Column(String, nullable=False)           # e.g. "2026-08"
    category = Column(String, nullable=False)
    recommended_amount = Column(Float, default=0)
    actual_amount = Column(Float, default=0)
    status = Column(String, default="on_track")      # "on_track" | "overspending" | "under"

    user = relationship("User", back_populates="budgets")
