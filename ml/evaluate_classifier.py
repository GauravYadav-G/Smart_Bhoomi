"""
evaluate_classifier.py
─────────────────────────────────────────────────────────────────────
Comprehensive evaluation of the SmartBhoomi fraud-risk classifier.
Generates IEEE-formatted output suitable for the research paper.

Outputs:
  1. Classification report (Table V in paper)
  2. Per-class metrics
  3. 5-fold cross-validation
  4. Feature importance ranking
  5. Comparison: RF vs Logistic Regression vs Decision Tree baselines
  6. Inference latency benchmark

Author: SmartBhoomi Research Team
─────────────────────────────────────────────────────────────────────
"""

import json
import os
import sys
import time

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.tree import DecisionTreeClassifier

# ─── Paths ───
ML_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(ML_DIR, "training_data.csv")
EVAL_OUTPUT_PATH = os.path.join(ML_DIR, "evaluation_results.json")

FEATURE_NAMES = [
    "doc_count",
    "has_ownership_deed",
    "has_sale_deed",
    "has_tax_receipt",
    "kyc_level_numeric",
    "coord_conflict_flag",
    "registration_hour",
    "valuation_log",
]


def main():
    print("═" * 65)
    print("  SmartBhoomi ML Classifier — Full Evaluation Report")
    print("  (For IEEE Paper Table V)")
    print("═" * 65)

    # ─── Load data ───
    df = pd.read_csv(DATA_PATH)
    X = df[FEATURE_NAMES].values
    y = df["fraud_label"].values.astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # ─── Define models to compare ───
    models = {
        "Random Forest": RandomForestClassifier(
            n_estimators=100, class_weight="balanced", random_state=42, n_jobs=-1
        ),
        "Decision Tree": DecisionTreeClassifier(
            class_weight="balanced", random_state=42, max_depth=10
        ),
        "Logistic Regression": LogisticRegression(
            class_weight="balanced", random_state=42, max_iter=1000
        ),
    }

    results = {}
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    print(f"\n📊 Dataset: {len(df)} samples ({(y==0).sum()} legit / {(y==1).sum()} fraud)")
    print(f"   Train: {len(X_train)} | Test: {len(X_test)}")

    for name, model in models.items():
        print(f"\n{'─'*65}")
        print(f"  Model: {name}")
        print(f"{'─'*65}")

        # Train
        t0 = time.time()
        model.fit(X_train, y_train)
        train_time = time.time() - t0

        # Predict
        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)[:, 1]

        # Metrics
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred)
        rec = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        auc = roc_auc_score(y_test, y_proba)
        cm = confusion_matrix(y_test, y_pred)

        # Cross-validation
        cv_f1 = cross_val_score(model, X, y, cv=cv, scoring="f1")
        cv_acc = cross_val_score(model, X, y, cv=cv, scoring="accuracy")

        # Inference latency (average over 1000 single-sample predictions)
        t0 = time.time()
        for _ in range(1000):
            model.predict(X_test[:1])
        inference_ms = (time.time() - t0) / 1000 * 1000  # per-prediction in ms

        print(classification_report(y_test, y_pred, target_names=["Legitimate", "Fraudulent"]))
        print(f"  ROC-AUC:        {auc:.4f}")
        print(f"  5-Fold CV F1:   {cv_f1.mean():.4f} ± {cv_f1.std():.4f}")
        print(f"  5-Fold CV Acc:  {cv_acc.mean():.4f} ± {cv_acc.std():.4f}")
        print(f"  Train time:     {train_time*1000:.1f} ms")
        print(f"  Inference:      {inference_ms:.3f} ms/prediction")
        print(f"  Confusion:      TN={cm[0][0]} FP={cm[0][1]} FN={cm[1][0]} TP={cm[1][1]}")

        results[name] = {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
            "roc_auc": round(auc, 4),
            "cv_f1_mean": round(cv_f1.mean(), 4),
            "cv_f1_std": round(cv_f1.std(), 4),
            "cv_acc_mean": round(cv_acc.mean(), 4),
            "train_time_ms": round(train_time * 1000, 1),
            "inference_ms": round(inference_ms, 3),
            "confusion_matrix": {
                "TN": int(cm[0][0]), "FP": int(cm[0][1]),
                "FN": int(cm[1][0]), "TP": int(cm[1][1]),
            },
        }

    # ─── Feature Importance (RF only) ───
    rf = models["Random Forest"]
    importances = rf.feature_importances_
    indices = np.argsort(importances)[::-1]

    print(f"\n{'─'*65}")
    print("  Random Forest Feature Importance")
    print(f"{'─'*65}")
    fi_dict = {}
    for i, idx in enumerate(indices):
        fi_dict[FEATURE_NAMES[idx]] = round(float(importances[idx]), 4)
        print(f"  {i+1}. {FEATURE_NAMES[idx]:25s}  {importances[idx]:.4f}")

    results["feature_importance"] = fi_dict

    # ─── Comparison Table (IEEE format) ───
    print(f"\n{'═'*65}")
    print("  TABLE V: Classifier Comparison (IEEE Paper)")
    print(f"{'═'*65}")
    print(f"{'Model':<25s} {'Acc':>7s} {'Prec':>7s} {'Rec':>7s} {'F1':>7s} {'AUC':>7s} {'Lat(ms)':>8s}")
    print("─" * 65)
    for name in models:
        r = results[name]
        print(f"{name:<25s} {r['accuracy']:>7.4f} {r['precision']:>7.4f} {r['recall']:>7.4f} {r['f1']:>7.4f} {r['roc_auc']:>7.4f} {r['inference_ms']:>8.3f}")

    # ─── Export ───
    with open(EVAL_OUTPUT_PATH, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n📄 Evaluation results → {EVAL_OUTPUT_PATH}")
    print("═" * 65)

    return results


if __name__ == "__main__":
    main()
