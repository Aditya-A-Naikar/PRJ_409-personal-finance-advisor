import os
from datetime import date, datetime
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.auth.dependencies import require_user
from app.database import get_db
from app.ml.classifier import classify
from app.models.transaction import Transaction
from app.schemas.transaction import (
    TransactionCreate,
    TransactionOut,
    UploadRowError,
    UploadSummary,
)
from app.services.normalization import normalize_merchant

router = APIRouter()

REQUIRED_CSV_COLUMNS = {"date", "description", "amount", "type"}

# Resolve sample CSV path relative to this file
_HERE = os.path.dirname(os.path.abspath(__file__))
SAMPLE_CSV_PATH = os.path.abspath(
    os.path.join(_HERE, "..", "..", "..", "data", "sample_transactions.csv")
)


# ── Sample CSV download ──────────────────────────────────────────────────────

@router.get("/sample-csv", tags=["transactions"])
def download_sample_csv():
    """Download the pre-generated sample CSV for testing uploads."""
    if not os.path.exists(SAMPLE_CSV_PATH):
        raise HTTPException(status_code=404, detail="Sample CSV not found — run scripts/generate_demo_data.py first")
    return FileResponse(SAMPLE_CSV_PATH, filename="sample_transactions.csv", media_type="text/csv")


# ── List transactions ────────────────────────────────────────────────────────

@router.get("", response_model=list[TransactionOut])
def list_transactions(
    category: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user=Depends(require_user),
    db: Session = Depends(get_db),
):
    """
    List the authenticated user's transactions with optional filters.
    user_id ALWAYS comes from the token — never from a query parameter.
    """
    q = db.query(Transaction).filter(Transaction.user_id == current_user.id)

    if category:
        q = q.filter(Transaction.category == category)
    if transaction_type:
        q = q.filter(Transaction.transaction_type == transaction_type)
    if start_date:
        q = q.filter(Transaction.date >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        q = q.filter(Transaction.date <= datetime.combine(end_date, datetime.max.time()))
    if search:
        like = f"%{search}%"
        q = q.filter(
            Transaction.description.ilike(like) | Transaction.merchant.ilike(like)
        )

    return q.order_by(Transaction.date.desc()).offset(skip).limit(limit).all()


# ── Create single transaction ────────────────────────────────────────────────

@router.post("", response_model=TransactionOut, status_code=201)
def create_transaction(
    payload: TransactionCreate,
    current_user=Depends(require_user),
    db: Session = Depends(get_db),
):
    """Create one transaction — runs it through the ML classifier live."""
    if payload.transaction_type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="transaction_type must be 'income' or 'expense'")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="amount must be positive")

    merchant = payload.merchant or normalize_merchant(payload.description)
    result = classify(payload.description)

    txn = Transaction(
        user_id=current_user.id,
        date=datetime.combine(payload.date, datetime.min.time()),
        description=payload.description,
        merchant=merchant,
        amount=payload.amount,
        transaction_type=payload.transaction_type,
        category=result["category"],
        confidence=result["confidence"],
        classification_method=result["method"],
        source="manual",
        is_recurring=False,
        recurring_group=None,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn


# ── CSV upload ───────────────────────────────────────────────────────────────

@router.post("/upload", response_model=UploadSummary)
def upload_transactions_csv(
    file: UploadFile = File(...),
    current_user=Depends(require_user),
    db: Session = Depends(get_db),
):
    """
    Upload a CSV file of transactions. Each row is classified live.
    Required columns: date, description, amount, type
    Optional column:  merchant (derived from description if absent)
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv")

    try:
        df = pd.read_csv(file.file)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse file as CSV")

    df.columns = [c.strip().lower() for c in df.columns]
    missing_cols = REQUIRED_CSV_COLUMNS - set(df.columns)
    if missing_cols:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {sorted(missing_cols)}",
        )

    errors: list[UploadRowError] = []
    objects: list[Transaction] = []

    for idx, row in df.iterrows():
        row_number = int(idx) + 2  # +2: 1-indexed + header row
        try:
            row_date = pd.to_datetime(row["date"]).date()
            description = str(row["description"]).strip()
            amount = float(row["amount"])
            txn_type = str(row["type"]).strip().lower()

            if not description:
                raise ValueError("description is empty")
            if amount <= 0:
                raise ValueError("amount must be positive")
            if txn_type not in ("income", "expense"):
                raise ValueError(f"type must be 'income' or 'expense', got '{txn_type}'")

            # Use merchant column if present and non-null, else normalize from description
            has_merchant_col = "merchant" in df.columns
            raw_merchant = row.get("merchant") if has_merchant_col else None
            merchant = (
                str(raw_merchant).strip()
                if has_merchant_col and pd.notna(raw_merchant) and str(raw_merchant).strip()
                else normalize_merchant(description)
            )

            result = classify(description)

            objects.append(Transaction(
                user_id=current_user.id,
                date=datetime.combine(row_date, datetime.min.time()),
                description=description,
                merchant=merchant,
                amount=amount,
                transaction_type=txn_type,
                category=result["category"],
                confidence=result["confidence"],
                classification_method=result["method"],
                source="csv",
                is_recurring=False,
                recurring_group=None,
            ))

        except Exception as exc:
            errors.append(UploadRowError(row_number=row_number, reason=str(exc)))

    if objects:
        db.bulk_save_objects(objects)
        db.commit()

    return UploadSummary(
        total_rows=len(df),
        imported=len(objects),
        failed=len(errors),
        errors=errors,
    )
