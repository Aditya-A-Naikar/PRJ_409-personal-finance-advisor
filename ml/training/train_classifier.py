"""
Trains a TF-IDF (character n-grams) + Logistic Regression classifier on
ml/datasets/training_data.csv and saves the trained pipeline plus honest
evaluation metrics. No fabricated numbers — what the test set gives is
what gets saved.

Run from the project root:
    source backend/venv/bin/activate
    python ml/training/train_classifier.py
"""
import json
import os
from datetime import datetime

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "..", "datasets", "training_data.csv")
MODEL_DIR = os.path.join(BASE_DIR, "..", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "classifier.pkl")
METRICS_PATH = os.path.join(MODEL_DIR, "metrics.json")


def train() -> None:
    os.makedirs(MODEL_DIR, exist_ok=True)

    df = pd.read_csv(DATA_PATH)
    print(f"Loaded {len(df)} labeled rows across {df['category'].nunique()} categories.")
    print(f"Class distribution:\n{df['category'].value_counts().to_string()}\n")

    X_train, X_test, y_train, y_test = train_test_split(
        df["description"],
        df["category"],
        test_size=0.2,
        random_state=42,
        stratify=df["category"],
    )

    pipeline = Pipeline([
        # char_wb n-grams: handles UPI-SWIGGY-XYZ and POS SWIGGY INSTAMART
        # as similar even though they share almost no whole words
        ("tfidf", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), min_df=1)),
        ("clf", LogisticRegression(max_iter=1000, C=1.0)),
    ])
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

    # Save model
    joblib.dump(pipeline, MODEL_PATH)

    # Save honest metrics
    metrics = {
        "trained_at": datetime.utcnow().isoformat(),
        "n_samples_total": len(df),
        "n_train": len(X_train),
        "n_test": len(X_test),
        "n_categories": int(df["category"].nunique()),
        "accuracy": round(accuracy, 4),
        "per_class_report": report,
    }
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"Trained on {len(X_train)} samples, tested on {len(X_test)}.")
    print(f"Test accuracy : {accuracy:.2%}")
    print(f"\nClassification report (test set):")
    print(classification_report(y_test, y_pred, zero_division=0))
    print(f"Model   → {MODEL_PATH}")
    print(f"Metrics → {METRICS_PATH}")


if __name__ == "__main__":
    train()
