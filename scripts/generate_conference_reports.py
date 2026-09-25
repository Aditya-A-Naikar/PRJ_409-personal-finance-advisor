import os
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split, learning_curve
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import label_binarize
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    classification_report,
    confusion_matrix,
    roc_curve,
    auc,
    log_loss
)

def run():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
    DATA_PATH = os.path.join(PROJECT_ROOT, "ml", "datasets", "training_data.csv")
    OUTPUT_DIR = os.path.join(PROJECT_ROOT, "ml", "reports", "conference_assets")
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(f"Loading data from: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    labels = sorted(df['category'].unique())
    n_classes = len(labels)
    print(f"Total samples: {len(df)} across {n_classes} classes.")

    X = df['description']
    y = df['category']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    tfidf = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), min_df=1)
    X_train_vec = tfidf.fit_transform(X_train)
    X_test_vec = tfidf.transform(X_test)

    # ─────────────────────────────────────────────────────────────
    # 1. PRIMARY MODEL: Logistic Regression
    # ─────────────────────────────────────────────────────────────
    clf = LogisticRegression(max_iter=1000, C=1.0, random_state=42)
    clf.fit(X_train_vec, y_train)

    y_pred = clf.predict(X_test_vec)
    y_prob = clf.predict_proba(X_test_vec)

    # ─────────────────────────────────────────────────────────────
    # 2. CONFUSION MATRIX PLOT
    # ─────────────────────────────────────────────────────────────
    cm = confusion_matrix(y_test, y_pred, labels=labels)
    plt.figure(figsize=(10, 8), dpi=300)
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=labels, yticklabels=labels, cbar=True)
    plt.title("Confusion Matrix — Transaction Classification Model (TF-IDF + Logistic Regression)", fontsize=13, fontweight='bold', pad=15)
    plt.xlabel("Predicted Category", fontsize=11, fontweight='bold')
    plt.ylabel("Actual Category", fontsize=11, fontweight='bold')
    plt.xticks(rotation=45, ha='right')
    plt.yticks(rotation=0)
    plt.tight_layout()
    cm_path = os.path.join(OUTPUT_DIR, "confusion_matrix.png")
    plt.savefig(cm_path)
    plt.close()
    print(f"Saved: {cm_path}")

    # ─────────────────────────────────────────────────────────────
    # 3. ROC CURVES (Multiclass One-vs-Rest)
    # ─────────────────────────────────────────────────────────────
    y_test_bin = label_binarize(y_test, classes=clf.classes_)
    
    fpr = dict()
    tpr = dict()
    roc_auc = dict()

    for i in range(len(clf.classes_)):
        # Calculate ROC for classes present in test set
        if np.sum(y_test_bin[:, i]) > 0:
            fpr[i], tpr[i], _ = roc_curve(y_test_bin[:, i], y_prob[:, i])
            roc_auc[i] = auc(fpr[i], tpr[i])
        else:
            roc_auc[i] = 0.0

    # Compute micro-average ROC curve
    fpr["micro"], tpr["micro"], _ = roc_curve(y_test_bin.ravel(), y_prob.ravel())
    roc_auc["micro"] = auc(fpr["micro"], tpr["micro"])

    plt.figure(figsize=(10, 8), dpi=300)
    plt.plot(fpr["micro"], tpr["micro"],
             label=f'Micro-average ROC (AUC = {roc_auc["micro"]:.2f})',
             color='deeppink', linestyle=':', linewidth=3)

    colors = plt.cm.tab20(np.linspace(0, 1, len(clf.classes_)))
    for i, color in zip(range(len(clf.classes_)), colors):
        if np.sum(y_test_bin[:, i]) > 0:
            plt.plot(fpr[i], tpr[i], color=color, lw=1.8,
                     label=f'{clf.classes_[i]} (AUC = {roc_auc[i]:.2f})')

    plt.plot([0, 1], [0, 1], 'k--', lw=1.5, alpha=0.7)
    plt.xlim([-0.02, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel("False Positive Rate (FPR)", fontsize=11, fontweight='bold')
    plt.ylabel("True Positive Rate (TPR)", fontsize=11, fontweight='bold')
    plt.title("Multiclass ROC Curves — Transaction Classifier (One-vs-Rest)", fontsize=13, fontweight='bold', pad=15)
    plt.legend(loc="lower right", fontsize=8, framealpha=0.9)
    plt.grid(True, linestyle='--', alpha=0.4)
    plt.tight_layout()
    roc_path = os.path.join(OUTPUT_DIR, "roc_curve.png")
    plt.savefig(roc_path)
    plt.close()
    print(f"Saved: {roc_path}")

    # ─────────────────────────────────────────────────────────────
    # 4. ACCURACY AND LOSS PLOTS (Learning Curve & Iteration Loss)
    # ─────────────────────────────────────────────────────────────
    # Using SGD with log_loss to track iterative training & validation loss/accuracy across epochs
    sgd = SGDClassifier(loss='log_loss', max_iter=1, warm_start=True, random_state=42, learning_rate='optimal')
    epochs = 60
    train_losses = []
    test_losses = []
    train_accs = []
    test_accs = []

    # Map labels to integers for log_loss
    label_to_idx = {l: i for i, l in enumerate(clf.classes_)}
    y_train_idx = np.array([label_to_idx[l] for l in y_train])
    y_test_idx = np.array([label_to_idx[l] for l in y_test])

    all_classes = np.arange(len(clf.classes_))
    for ep in range(epochs):
        sgd.partial_fit(X_train_vec, y_train_idx, classes=all_classes)
        
        prob_train = sgd.predict_proba(X_train_vec)
        prob_test = sgd.predict_proba(X_test_vec)
        
        pred_train = sgd.predict(X_train_vec)
        pred_test = sgd.predict(X_test_vec)

        train_losses.append(log_loss(y_train_idx, prob_train, labels=all_classes))
        test_losses.append(log_loss(y_test_idx, prob_test, labels=all_classes))
        train_accs.append(accuracy_score(y_train_idx, pred_train))
        test_accs.append(accuracy_score(y_test_idx, pred_test))

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5.5), dpi=300)

    # Accuracy Plot
    ax1.plot(range(1, epochs + 1), [a * 100 for a in train_accs], 'b-', lw=2, label='Training Accuracy')
    ax1.plot(range(1, epochs + 1), [a * 100 for a in test_accs], 'g--', lw=2, label='Validation / Test Accuracy')
    ax1.set_title("Training vs Validation Accuracy", fontsize=12, fontweight='bold')
    ax1.set_xlabel("Epochs / Iterations", fontsize=10, fontweight='bold')
    ax1.set_ylabel("Accuracy (%)", fontsize=10, fontweight='bold')
    ax1.legend(loc='lower right')
    ax1.grid(True, linestyle='--', alpha=0.5)

    # Loss Plot
    ax2.plot(range(1, epochs + 1), train_losses, 'r-', lw=2, label='Training Cross-Entropy Loss')
    ax2.plot(range(1, epochs + 1), test_losses, 'orange', linestyle='--', lw=2, label='Validation Loss')
    ax2.set_title("Training vs Validation Loss", fontsize=12, fontweight='bold')
    ax2.set_xlabel("Epochs / Iterations", fontsize=10, fontweight='bold')
    ax2.set_ylabel("Cross-Entropy Loss", fontsize=10, fontweight='bold')
    ax2.legend(loc='upper right')
    ax2.grid(True, linestyle='--', alpha=0.5)

    plt.suptitle("Model Convergence & Optimization Dynamics (Cross-Entropy Loss & Accuracy)", fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    acc_loss_path = os.path.join(OUTPUT_DIR, "accuracy_loss_plots.png")
    plt.savefig(acc_loss_path)
    plt.close()
    print(f"Saved: {acc_loss_path}")

    # ─────────────────────────────────────────────────────────────
    # 5. BENCHMARK COMPARISON OF ALL MODELS (For Conference Paper)
    # ─────────────────────────────────────────────────────────────
    models = {
        "Multinomial Logistic Regression (Proposed)": LogisticRegression(max_iter=1000, C=1.0, random_state=42),
        "Multinomial Naive Bayes": MultinomialNB(alpha=0.5),
        "Random Forest Classifier": RandomForestClassifier(n_estimators=100, random_state=42),
        "Linear SVM (SGD)": SGDClassifier(loss='hinge', max_iter=1000, random_state=42)
    }

    comparison_results = []
    for name, m in models.items():
        m.fit(X_train_vec, y_train)
        preds = m.predict(X_test_vec)
        acc = accuracy_score(y_test, preds)
        p, r, f1, _ = precision_recall_fscore_support(y_test, preds, average='weighted', zero_division=0)
        comparison_results.append({
            "Model": name,
            "Accuracy": acc * 100,
            "Precision": p * 100,
            "Recall": r * 100,
            "F1-Score": f1 * 100
        })

    comp_df = pd.DataFrame(comparison_results)
    comp_df_path = os.path.join(OUTPUT_DIR, "model_comparison.csv")
    comp_df.to_csv(comp_df_path, index=False)
    print(f"Saved: {comp_df_path}")

    # Model comparison plot
    plt.figure(figsize=(11, 6), dpi=300)
    x = np.arange(len(comp_df))
    width = 0.2
    plt.bar(x - 1.5 * width, comp_df['Accuracy'], width, label='Accuracy (%)', color='#2563EB')
    plt.bar(x - 0.5 * width, comp_df['Precision'], width, label='Precision (%)', color='#059669')
    plt.bar(x + 0.5 * width, comp_df['Recall'], width, label='Recall (%)', color='#D97706')
    plt.bar(x + 1.5 * width, comp_df['F1-Score'], width, label='F1-Score (%)', color='#7C3AED')

    plt.xticks(x, [n.replace(" ", "\n") for n in comp_df['Model']], fontsize=9)
    plt.ylabel("Score (%)", fontsize=11, fontweight='bold')
    plt.ylim([0, 105])
    plt.title("Comparative Performance Benchmark of ML Models on Finance Dataset", fontsize=13, fontweight='bold', pad=15)
    plt.legend(loc='lower right', fontsize=9)
    plt.grid(axis='y', linestyle='--', alpha=0.5)
    plt.tight_layout()
    comp_plot_path = os.path.join(OUTPUT_DIR, "model_comparison.png")
    plt.savefig(comp_plot_path)
    plt.close()
    print(f"Saved: {comp_plot_path}")

    # ─────────────────────────────────────────────────────────────
    # 6. DETAILED CLASSIFICATION REPORT (Per-class & Global)
    # ─────────────────────────────────────────────────────────────
    report_dict = classification_report(y_test, y_pred, target_names=labels, output_dict=True, zero_division=0)
    report_df = pd.DataFrame(report_dict).transpose()
    report_csv_path = os.path.join(OUTPUT_DIR, "classification_report.csv")
    report_df.to_csv(report_csv_path)
    print(f"Saved: {report_csv_path}")

    # Summary JSON for programmatic reference
    summary = {
        "n_samples": len(df),
        "n_classes": n_classes,
        "classes": labels,
        "accuracy": accuracy_score(y_test, y_pred),
        "macro_auc": roc_auc["micro"],
        "comparison": comparison_results
    }
    with open(os.path.join(OUTPUT_DIR, "summary.json"), "w") as f:
        json.dump(summary, f, indent=2)

    print("\nALL CONFERENCE ARTIFACTS GENERATED SUCCESSFULLY!")
    print(f"Artifact directory: {OUTPUT_DIR}")

if __name__ == "__main__":
    run()
