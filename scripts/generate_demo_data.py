"""
Generates realistic synthetic Indian financial transactions for the demo user.
Pure data generation — no database dependency, so this can also be run standalone
to regenerate data/sample_transactions.csv (used later for CSV-upload testing).

Design decisions:
  - random.seed(42): reproducible data — same output every run
  - classification_method "demo-seed": honest label, not claiming ML did this
  - is_recurring pre-tagged on known merchants as a demo convenience;
    Phase 6 will compute it properly from the data itself
"""
import csv
import os
import random
from datetime import date

random.seed(42)  # reproducible demo data — same output every run

MONTHS = [(2026, 3), (2026, 4), (2026, 5), (2026, 6), (2026, 7), (2026, 8)]  # Mar–Aug 2026

# Merchants Phase 6 will watch for drift / recurring patterns
RECURRING_MERCHANTS = {"Netflix", "Spotify", "Gym", "Rent", "EMI", "Dine-Out"}


def _d(year: int, month: int, day: int) -> date:
    """Clamp day to 28 so it's always valid regardless of month length."""
    return date(year, month, min(day, 28))


def generate_transactions() -> list[dict]:
    txns: list[dict] = []

    # ── Salary: income, perfectly stable, every month ───────────────────────
    for y, m in MONTHS:
        txns.append({
            "date": _d(y, m, 1),
            "description": "NEFT SALARY CREDIT XYZCORP",
            "merchant": "Salary",
            "amount": 55000,
            "transaction_type": "income",
            "category": "Salary/Income",
        })

    # ── Rent: stable recurring expense ──────────────────────────────────────
    for y, m in MONTHS:
        txns.append({
            "date": _d(y, m, 3),
            "description": "UPI-RENT-LANDLORD",
            "merchant": "Rent",
            "amount": 15000,
            "transaction_type": "expense",
            "category": "Rent",
        })

    # ── EMI: stable recurring expense ────────────────────────────────────────
    for y, m in MONTHS:
        txns.append({
            "date": _d(y, m, 5),
            "description": "AUTO DEBIT EMI HDFC",
            "merchant": "EMI",
            "amount": 7500,
            "transaction_type": "expense",
            "category": "EMI",
        })

    # ── Netflix: the headline creeping-cost example ──────────────────────────
    # 5 months (skips month 1), price steps up twice
    netflix_prices = [499, 499, 649, 649, 799]
    for (y, m), price in zip(MONTHS[1:], netflix_prices):
        txns.append({
            "date": _d(y, m, 7),
            "description": "UPI-NETFLIX-SUBSCRIPTION",
            "merchant": "Netflix",
            "amount": price,
            "transaction_type": "expense",
            "category": "Subscription",
        })

    # ── Spotify: stable subscription, contrast case ──────────────────────────
    for y, m in MONTHS:
        txns.append({
            "date": _d(y, m, 8),
            "description": "UPI-SPOTIFY-SUBSCRIPTION",
            "merchant": "Spotify",
            "amount": 119,
            "transaction_type": "expense",
            "category": "Subscription",
        })

    # ── Gym: newly recurring — only last 3 months ────────────────────────────
    for y, m in MONTHS[-3:]:
        txns.append({
            "date": _d(y, m, 10),
            "description": "UPI-GYM-FITNESSCLUB",
            "merchant": "Gym",
            "amount": 1500,
            "transaction_type": "expense",
            "category": "Subscription",
        })

    # ── Electricity: small monthly variance ──────────────────────────────────
    for y, m in MONTHS:
        txns.append({
            "date": _d(y, m, 12),
            "description": "BILLPAY ELECTRICITY BOARD",
            "merchant": "Electricity Board",
            "amount": round(random.uniform(900, 1400), 2),
            "transaction_type": "expense",
            "category": "Utilities",
        })

    # ── Dining out: creeping category-level cost ──────────────────────────────
    dining_amounts = [2500, 3100, 3700, 4600]  # last 4 months
    for (y, m), amt in zip(MONTHS[-4:], dining_amounts):
        txns.append({
            "date": _d(y, m, 15),
            "description": "POS BARBEQUE NATION DINEOUT",
            "merchant": "Dine-Out",
            "amount": amt,
            "transaction_type": "expense",
            "category": "Food",
        })

    # ── Food delivery: everyday noise, no strong trend ────────────────────────
    food_merchants = ["Swiggy", "Zomato", "Zepto"]
    for y, m in MONTHS:
        for _ in range(random.randint(6, 10)):
            day = random.randint(1, 27)
            merchant = random.choice(food_merchants)
            txns.append({
                "date": _d(y, m, day),
                "description": f"UPI-{merchant.upper()}-ORDER",
                "merchant": merchant,
                "amount": round(random.uniform(150, 750), 2),
                "transaction_type": "expense",
                "category": "Food",
            })

    # ── Transport: frequent small amounts ────────────────────────────────────
    transport_merchants = ["Uber", "Ola"]
    for y, m in MONTHS:
        for _ in range(random.randint(8, 14)):
            day = random.randint(1, 27)
            merchant = random.choice(transport_merchants)
            txns.append({
                "date": _d(y, m, day),
                "description": f"UPI-{merchant.upper()}-RIDE",
                "merchant": merchant,
                "amount": round(random.uniform(90, 380), 2),
                "transaction_type": "expense",
                "category": "Transport",
            })

    # ── Shopping: occasional, larger, irregular ───────────────────────────────
    shopping_merchants = ["Amazon", "Flipkart"]
    for y, m in MONTHS:
        for _ in range(random.randint(1, 3)):
            day = random.randint(1, 27)
            merchant = random.choice(shopping_merchants)
            txns.append({
                "date": _d(y, m, day),
                "description": f"POS {merchant.upper()} PAYMENTS",
                "merchant": merchant,
                "amount": round(random.uniform(500, 4500), 2),
                "transaction_type": "expense",
                "category": "Shopping",
            })

    # ── Mobile/Internet recharge: stable monthly ─────────────────────────────
    telecom_merchants = ["Jio", "Airtel"]
    for y, m in MONTHS:
        merchant = random.choice(telecom_merchants)
        txns.append({
            "date": _d(y, m, 18),
            "description": f"UPI-{merchant.upper()}-RECHARGE",
            "merchant": merchant,
            "amount": round(random.uniform(279, 599), 2),
            "transaction_type": "expense",
            "category": "Utilities",
        })

    # ── Healthcare: occasional ────────────────────────────────────────────────
    for y, m in random.sample(MONTHS, 3):
        txns.append({
            "date": _d(y, m, 20),
            "description": "POS APOLLO PHARMACY",
            "merchant": "Apollo Pharmacy",
            "amount": round(random.uniform(200, 1200), 2),
            "transaction_type": "expense",
            "category": "Healthcare",
        })

    # ── Education: one-off course fee ────────────────────────────────────────
    y, m = MONTHS[-2]
    txns.append({
        "date": _d(y, m, 22),
        "description": "UPI-UDEMY-COURSE",
        "merchant": "Udemy",
        "amount": 799,
        "transaction_type": "expense",
        "category": "Education",
    })

    txns.sort(key=lambda t: t["date"])
    return txns


def write_sample_csv(txns: list[dict], path: str) -> None:
    """
    Writes CSV with columns the upload endpoint expects: date, description,
    amount, type, merchant — deliberately no category column, since
    classification is the ML classifier's job (Phase 5).
    """
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["date", "description", "amount", "type", "merchant"])
        for t in txns:
            writer.writerow([
                t["date"].isoformat(),
                t["description"],
                t["amount"],
                t["transaction_type"],
                t["merchant"],
            ])


if __name__ == "__main__":
    txns = generate_transactions()
    out_path = os.path.join(os.path.dirname(__file__), "..", "data", "sample_transactions.csv")
    write_sample_csv(txns, out_path)
    print(f"Generated {len(txns)} synthetic transactions.")
    print(f"Sample CSV written to: {os.path.abspath(out_path)}")

    # Quick sanity check — print Netflix rows
    netflix = [t for t in txns if t["merchant"] == "Netflix"]
    print("\nNetflix price drift (should show 499→499→649→649→799):")
    for t in netflix:
        print(f"  {t['date']}  ₹{t['amount']}")
