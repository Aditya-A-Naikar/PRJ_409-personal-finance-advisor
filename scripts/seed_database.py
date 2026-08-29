"""
Seeds the database with a demo user and synthetic transactions from
generate_demo_data.py.

Safe to re-run — clears and rebuilds the demo user's transactions each time
so the demo stays in a known, reproducible state. Never creates duplicate users.

Run from the PROJECT ROOT (not inside backend/):
    source backend/venv/bin/activate
    python scripts/seed_database.py
"""
import os
import sys
from datetime import datetime

# ── Path setup ────────────────────────────────────────────────────────────────
# Switch cwd to backend/ so .env and the sqlite path resolve exactly as they
# do when uvicorn runs (pydantic-settings reads .env relative to cwd).
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
os.chdir(BACKEND_DIR)
sys.path.insert(0, BACKEND_DIR)

# Scripts dir (for generate_demo_data sibling import)
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPTS_DIR)

# ── Imports (after path setup) ────────────────────────────────────────────────
from app.database import SessionLocal, Base, engine  # noqa: E402
from app import models  # noqa: E402, F401 — side-effect: registers all models with Base
from app.models.user import User  # noqa: E402
from app.models.transaction import Transaction  # noqa: E402
from app.auth.security import hash_password  # noqa: E402
from generate_demo_data import generate_transactions, RECURRING_MERCHANTS  # noqa: E402

DEMO_USERNAME = "demo_user"
DEMO_PASSWORD = "Demo@123"
DEMO_EMAIL = "demo@example.com"


def get_or_create_demo_user(db) -> User:
    user = db.query(User).filter(User.username == DEMO_USERNAME).first()
    if user:
        print(f"Demo user already exists: {user.user_id} (username: {DEMO_USERNAME})")
        return user

    count = db.query(User).count()
    user = User(
        user_id=f"USER{count + 1:03d}",
        name="Demo User",
        username=DEMO_USERNAME,
        email=DEMO_EMAIL,
        password_hash=hash_password(DEMO_PASSWORD),
        role="USER",
        status="active",
        monthly_income=55000,
        monthly_budget=45000,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"Created demo user: {user.user_id} (username: {DEMO_USERNAME})")
    return user


def seed() -> None:
    # Safety net — creates tables if init_db.py hasn't been run yet
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        user = get_or_create_demo_user(db)

        # Clear existing demo transactions so re-runs stay idempotent
        existing_count = db.query(Transaction).filter(Transaction.user_id == user.id).count()
        if existing_count:
            db.query(Transaction).filter(Transaction.user_id == user.id).delete()
            db.commit()
            print(f"Cleared {existing_count} existing demo transactions.")

        txns = generate_transactions()
        objects = []
        for t in txns:
            is_recurring = t["merchant"] in RECURRING_MERCHANTS
            objects.append(Transaction(
                user_id=user.id,
                date=datetime.combine(t["date"], datetime.min.time()),
                description=t["description"],
                merchant=t["merchant"],
                amount=t["amount"],
                transaction_type=t["transaction_type"],
                category=t["category"],
                confidence=1.0,
                # Honest label — this was assigned by the generator, not the ML model.
                # Phase 5 will overwrite these with real classifier output.
                classification_method="demo-seed",
                source="demo",
                is_recurring=is_recurring,
                recurring_group=t["merchant"] if is_recurring else None,
            ))

        db.bulk_save_objects(objects)
        db.commit()

        print(f"Seeded {len(txns)} transactions for '{DEMO_USERNAME}'.")
        print(f"\nLogin credentials:")
        print(f"  username : {DEMO_USERNAME}")
        print(f"  password : {DEMO_PASSWORD}")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
