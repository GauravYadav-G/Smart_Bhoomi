"""
ml_server.py
─────────────────────────────────────────────────────────────────────
Lightweight Flask REST API serving the trained Random Forest fraud-
risk classifier for SmartBhoomi.

Endpoint:
  POST /api/ml/classify-document
    Body (JSON):
      {
        "documents": [{"documentType": "ownership_deed"}, ...],
        "kyc_level": "full",
        "coord_conflict": false,
        "registration_ts": "2025-06-15T10:30:00Z",
        "valuation_inr": 5000000
      }

    Response (JSON):
      {
        "fraud_probability": 0.12,
        "risk_label": "low",
        "confidence": 0.88,
        "features_used": { ... },
        "model_version": "rf-100-balanced-v1"
      }

Risk thresholds:
  fraud_probability < 0.3  → "low"
  0.3 ≤ prob < 0.7         → "medium"
  prob ≥ 0.7               → "high"

Run:
  python ml_server.py          # starts on port 5050

Author: SmartBhoomi Research Team
─────────────────────────────────────────────────────────────────────
"""

import os
import sys

import joblib
import numpy as np
from flask import Flask, jsonify, request

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_features import FEATURE_NAMES, extract_features

# ─── Configuration ───
ML_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(ML_DIR, "fraud_classifier.joblib")
PORT = int(os.environ.get("ML_SERVER_PORT", 5050))
MODEL_VERSION = "rf-100-balanced-v1"

# ─── Load model ───
if not os.path.exists(MODEL_PATH):
    print(f"❌ Model not found at {MODEL_PATH}")
    print("   Run: python train_fraud_classifier.py first.")
    sys.exit(1)

clf = joblib.load(MODEL_PATH)
print(f"✅ Model loaded: {MODEL_PATH}")

# ─── Flask App ───
app = Flask(__name__)


@app.route("/api/ml/classify-document", methods=["POST"])
def classify_document():
    """Classify a property registration as legitimate or fraudulent."""
    try:
        data = request.get_json(force=True)

        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        # Extract features
        features = extract_features(data)
        X = np.array(features).reshape(1, -1)

        # Predict
        proba = clf.predict_proba(X)[0]
        fraud_prob = float(proba[1])
        legit_prob = float(proba[0])

        # Risk label
        if fraud_prob < 0.3:
            risk_label = "low"
        elif fraud_prob < 0.7:
            risk_label = "medium"
        else:
            risk_label = "high"

        confidence = float(max(proba))

        return jsonify({
            "fraud_probability": round(fraud_prob, 4),
            "legitimate_probability": round(legit_prob, 4),
            "risk_label": risk_label,
            "confidence": round(confidence, 4),
            "features_used": dict(zip(FEATURE_NAMES, features)),
            "model_version": MODEL_VERSION,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/ml/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "ok",
        "model_loaded": clf is not None,
        "model_version": MODEL_VERSION,
        "n_estimators": clf.n_estimators,
        "n_features": clf.n_features_in_,
    })


if __name__ == "__main__":
    print(f"🚀 ML Server starting on port {PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
