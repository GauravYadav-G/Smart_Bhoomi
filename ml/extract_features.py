"""
extract_features.py
─────────────────────────────────────────────────────────────────────
Feature extraction for SmartBhoomi fraud-risk classification.

Extracts 8 numeric features from a property registration record that
are fed to a Random Forest classifier to predict fraud risk.

Features:
  1. doc_count               — Number of uploaded documents (0-10)
  2. has_ownership_deed      — Binary: ownership deed present
  3. has_sale_deed           — Binary: sale deed present
  4. has_tax_receipt         — Binary: tax receipt present
  5. kyc_level_numeric       — KYC level (none=0, basic=1, standard=2, full=3)
  6. coord_conflict_flag     — Binary: coordinate conflict detected
  7. registration_hour       — Hour of day (0-23) registration was submitted
  8. valuation_log           — log10(property value in INR + 1)

Target:
  fraud_label               — 0 = legitimate, 1 = fraudulent

Author: SmartBhoomi Research Team
─────────────────────────────────────────────────────────────────────
"""

import math
from typing import Any


def extract_features(record: dict[str, Any]) -> list[float]:
    """
    Extract 8 numeric features from a single property record dict.

    Parameters
    ----------
    record : dict
        Keys expected:
          documents        : list[dict] with 'documentType' key
          kyc_level        : str  ('none', 'basic', 'standard', 'full')
          coord_conflict   : bool
          registration_ts  : str  ISO 8601 timestamp
          valuation_inr    : float

    Returns
    -------
    list[float]  — length-8 feature vector
    """

    docs = record.get("documents", [])
    doc_types = {d.get("documentType", "") for d in docs}

    doc_count = float(len(docs))
    has_ownership_deed = 1.0 if "ownership_deed" in doc_types else 0.0
    has_sale_deed = 1.0 if "sale_deed" in doc_types else 0.0
    has_tax_receipt = 1.0 if "tax_receipt" in doc_types else 0.0

    kyc_map = {"none": 0, "basic": 1, "standard": 2, "full": 3}
    kyc_level_numeric = float(kyc_map.get(record.get("kyc_level", "none"), 0))

    coord_conflict_flag = 1.0 if record.get("coord_conflict", False) else 0.0

    # Registration hour (0-23)
    reg_ts = record.get("registration_ts", "")
    try:
        # Parse ISO-8601 "2025-01-15T14:30:00Z"
        hour_str = reg_ts.split("T")[1][:2] if "T" in reg_ts else "12"
        registration_hour = float(int(hour_str))
    except (IndexError, ValueError):
        registration_hour = 12.0  # default noon

    # Log valuation
    val = record.get("valuation_inr", 0)
    valuation_log = math.log10(max(float(val), 0) + 1)

    return [
        doc_count,
        has_ownership_deed,
        has_sale_deed,
        has_tax_receipt,
        kyc_level_numeric,
        coord_conflict_flag,
        registration_hour,
        valuation_log,
    ]


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


if __name__ == "__main__":
    # Quick smoke test
    sample = {
        "documents": [
            {"documentType": "ownership_deed"},
            {"documentType": "sale_deed"},
            {"documentType": "tax_receipt"},
        ],
        "kyc_level": "full",
        "coord_conflict": False,
        "registration_ts": "2025-06-15T10:30:00Z",
        "valuation_inr": 5_000_000,
    }
    feats = extract_features(sample)
    print(f"Features ({len(feats)}): {feats}")
    print(f"Names:    {FEATURE_NAMES}")
