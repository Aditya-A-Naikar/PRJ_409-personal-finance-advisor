"""
Wraps the trained TF-IDF + Logistic Regression pipeline with a rule-based
fallback. If the model file is missing or confidence is below threshold,
rule matching kicks in so the app never crashes or returns garbage (Section 50).

Loaded lazily on first use — uvicorn import time stays fast.
"""
import os

import joblib

# Path relative to this file: backend/app/ml/ → up 4 levels to project root → ml/models/
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.abspath(
    os.path.join(BASE_DIR, "..", "..", "..", "ml", "models", "classifier.pkl")
)

CONFIDENCE_THRESHOLD = 0.55  # below this, prefer rule-based result if it's not "Other"

# Keyword fallback — used when ML model unavailable OR confidence is too low
RULE_KEYWORDS: dict[str, list[str]] = {
    "Food": ["swiggy", "zomato", "zepto", "dineout", "cafe", "mcdonald", "domino", "burger", "restaurant", "pizza"],
    "Rent": ["rent", "landlord"],
    "Transport": ["uber", "ola", "rapido", "metro", "cab", "auto"],
    "Shopping": ["amazon", "flipkart", "myntra", "ajio", "trends", "snapdeal", "reliance"],
    "Subscription": ["netflix", "spotify", "gym", "prime", "hotstar", "youtube", "cultfit", "disney", "unacademy"],
    "Utilities": ["electricity", "water board", "gas", "jio", "airtel", "recharge", "broadband", "vi-", "bsnl"],
    "EMI": ["emi", "loan"],
    "Healthcare": ["pharmacy", "apollo", "medplus", "practo", "hospital", "1mg", "diagnostic", "fortis", "doctor"],
    "Education": ["udemy", "coursera", "byjus", "college", "tuition", "course", "school fee", "unacademy"],
    "Entertainment": ["bookmyshow", "pvr", "inox", "cinema", "movie", "gaming", "multiplex", "sports event"],
    "Salary/Income": ["salary", "sal credit"],
}

_pipeline = None
_model_load_failed = False


def _get_pipeline():
    global _pipeline, _model_load_failed
    if _pipeline is not None or _model_load_failed:
        return _pipeline
    try:
        _pipeline = joblib.load(MODEL_PATH)
        print(f"[classifier] ML model loaded from {MODEL_PATH}")
    except Exception as e:
        print(f"[classifier] Could not load ML model: {e}. Using rule-based fallback.")
        _model_load_failed = True
    return _pipeline


def _rule_based_classify(description: str) -> tuple[str, float, str]:
    lower = description.lower()
    for category, keywords in RULE_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return category, 0.5, "rule"
    return "Other", 0.3, "rule"


def classify(description: str) -> dict:
    """
    Returns:
        {"category": str, "confidence": float, "method": "ML" | "rule"}
    """
    pipeline = _get_pipeline()

    if pipeline is None:
        cat, conf, method = _rule_based_classify(description)
        return {"category": cat, "confidence": conf, "method": method}

    probs = pipeline.predict_proba([description])[0]
    classes = pipeline.classes_
    best_idx = int(probs.argmax())
    category = classes[best_idx]
    confidence = float(probs[best_idx])

    # If ML is uncertain, try rule fallback before defaulting to "Other"
    if confidence < CONFIDENCE_THRESHOLD:
        rule_cat, rule_conf, _ = _rule_based_classify(description)
        if rule_cat != "Other":
            return {"category": rule_cat, "confidence": rule_conf, "method": "rule"}

    return {"category": category, "confidence": round(confidence, 4), "method": "ML"}
