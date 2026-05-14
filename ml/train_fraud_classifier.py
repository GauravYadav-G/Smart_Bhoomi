"""
train_fraud_classifier.py
─────────────────────────────────────────────────────────────────────
Trains a Random Forest classifier for SmartBhoomi fraud-risk detection
and exports the model + evaluation metrics.

Pipeline:
  1. Load training_data.csv (200 samples, 8 features, binary label)
  2. Stratified 80/20 train-test split
  3. Train RandomForestClassifier(n_estimators=100, class_weight='balanced')
  4. Evaluate: accuracy, precision, recall, F1, ROC-AUC, confusion matrix
  5. Export model to fraud_classifier.joblib
  6. Print classification report (IEEE-ready)

Requirements:
  pip install scikit-learn pandas joblib

Author: SmartBhoomi Research Team
─────────────────────────────────────────────────────────────────────
"""

import json
import os
import sys
import time

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
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

# ─── Paths ───
ML_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(ML_DIR, "training_data.csv")
MODEL_PATH = os.path.join(ML_DIR, "fraud_classifier.joblib")
METRICS_PATH = os.path.join(ML_DIR, "classifier_metrics.json")

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
    print("  SmartBhoomi Fraud-Risk Classifier — Training Pipeline")
    print("═" * 65)

    # ─── 1. Load data ───
    if not os.path.exists(DATA_PATH):
        print(f"❌ Training data not found at {DATA_PATH}")
        print("   Run:  python create_training_dataset.py  first.")
        sys.exit(1)

    df = pd.read_csv(DATA_PATH)
    X = df[FEATURE_NAMES].values
    y = df["fraud_label"].values.astype(int)
    print(f"\n📊 Dataset: {len(df)} samples, {X.shape[1]} features")
    print(f"   Class 0 (legitimate): {(y == 0).sum()}")
    print(f"   Class 1 (fraudulent): {(y == 1).sum()}")

    # ─── 2. Train-test split (stratified) ───
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"\n🔀 Split: {len(X_train)} train / {len(X_test)} test (stratified)")

    # ─── 3. Train Random Forest ───
    print("\n🌲 Training RandomForestClassifier ...")
    t0 = time.time()
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        max_features="sqrt",
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_train, y_train)
    train_time = time.time() - t0
    print(f"   Training time: {train_time:.3f}s")

    # ─── 4. Evaluate on test set ───
    y_pred = clf.predict(X_test)
    y_proba = clf.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_proba)
    cm = confusion_matrix(y_test, y_pred)

    print("\n─── Test Set Results ──────────────────────────────────────")
    print(classification_report(y_test, y_pred, target_names=["Legitimate", "Fraudulent"]))
    print(f"ROC-AUC: {auc:.4f}")
    print(f"\nConfusion Matrix:")
    print(f"  TN={cm[0][0]}  FP={cm[0][1]}")
    print(f"  FN={cm[1][0]}  TP={cm[1][1]}")

    # ─── 5. 5-Fold Cross-Validation ───
    print("\n─── 5-Fold Stratified Cross-Validation ────────────────────")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(clf, X, y, cv=cv, scoring="f1")
    print(f"  F1 scores: {[f'{s:.4f}' for s in cv_scores]}")
    print(f"  Mean F1:   {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    cv_acc = cross_val_score(clf, X, y, cv=cv, scoring="accuracy")
    print(f"  Mean Acc:  {cv_acc.mean():.4f} ± {cv_acc.std():.4f}")

    # ─── 6. Feature Importance ───
    importances = clf.feature_importances_
    indices = np.argsort(importances)[::-1]
    print("\n─── Feature Importance ────────────────────────────────────")
    for i, idx in enumerate(indices):
        print(f"  {i+1}. {FEATURE_NAMES[idx]:25s}  {importances[idx]:.4f}")

    # ─── 7. Export model ───
    joblib.dump(clf, MODEL_PATH)
    print(f"\n💾 Model saved → {MODEL_PATH}")

    # ─── 8. Export metrics JSON (for paper) ───
    metrics = {
        "model": "RandomForestClassifier",
        "n_estimators": 100,
        "class_weight": "balanced",
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "training_time_s": round(train_time, 3),
        "test_accuracy": round(acc, 4),
        "test_precision": round(prec, 4),
        "test_recall": round(rec, 4),
        "test_f1": round(f1, 4),
        "test_roc_auc": round(auc, 4),
        "confusion_matrix": {"TN": int(cm[0][0]), "FP": int(cm[0][1]), "FN": int(cm[1][0]), "TP": int(cm[1][1])},
        "cv_5fold_f1_mean": round(cv_scores.mean(), 4),
        "cv_5fold_f1_std": round(cv_scores.std(), 4),
        "cv_5fold_acc_mean": round(cv_acc.mean(), 4),
        "feature_importance": {FEATURE_NAMES[i]: round(importances[i], 4) for i in indices},
    }

    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"📄 Metrics saved → {METRICS_PATH}")

    print("\n═" * 65)
    return metrics


if __name__ == "__main__":
    main()
