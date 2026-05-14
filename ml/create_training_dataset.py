"""
create_training_dataset.py
─────────────────────────────────────────────────────────────────────
Generates a synthetic labelled dataset for the SmartBhoomi fraud-risk
Random Forest classifier.

Produces 200 samples (configurable): ~140 legitimate (70%) + ~60
fraudulent (30%), matching the expected class distribution for Indian
land-registration systems.

Fraud patterns encoded:
  • Missing critical documents (ownership deed, sale deed)
  • Low / no KYC
  • Coordinate conflicts
  • Odd-hour registrations (midnight–5 AM)
  • Extremely high valuations with minimal docs

Output: ml/training_data.csv  (8 features + 1 label)

Author: SmartBhoomi Research Team
─────────────────────────────────────────────────────────────────────
"""

import csv
import math
import os
import random
import sys

# ─── Configuration ───
N_SAMPLES = 200
FRAUD_RATIO = 0.30  # 30% fraud
SEED = 42
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "training_data.csv")

FEATURE_NAMES = [
    "doc_count",
    "has_ownership_deed",
    "has_sale_deed",
    "has_tax_receipt",
    "kyc_level_numeric",
    "coord_conflict_flag",
    "registration_hour",
    "valuation_log",
    "fraud_label",
]


def generate_legitimate() -> list[float]:
    """Generate one legitimate registration feature vector."""
    doc_count = random.choice([3, 4, 5, 6])
    has_ownership = 1.0 if random.random() < 0.92 else 0.0  # occasionally missing
    has_sale = 1.0 if random.random() < 0.80 else 0.0
    has_tax = 1.0 if random.random() < 0.85 else 0.0
    kyc = float(random.choice([1, 2, 2, 3, 3, 3]))  # some only basic
    conflict = 1.0 if random.random() < 0.08 else 0.0  # occasional false alarm
    hour = float(random.choice(range(6, 23)))  # wide business hours
    val = random.uniform(200_000, 80_000_000)
    val_log = math.log10(val + 1)
    return [doc_count, has_ownership, has_sale, has_tax, kyc, conflict, hour, val_log, 0.0]


def generate_fraudulent() -> list[float]:
    """Generate one fraudulent registration feature vector."""
    pattern = random.choice(["no_docs", "low_kyc", "conflict", "odd_hour", "combo", "subtle"])

    # Defaults (somewhat suspicious)
    doc_count = float(random.choice([0, 1, 2]))
    has_ownership = 0.0
    has_sale = 0.0
    has_tax = 0.0
    kyc = float(random.choice([0, 0, 1]))
    conflict = 0.0
    hour = float(random.choice(range(0, 6)))  # midnight - 5 AM
    val = random.uniform(10_000_000, 200_000_000)  # suspiciously high
    val_log = math.log10(val + 1)

    if pattern == "no_docs":
        doc_count = float(random.choice([0, 1]))
        kyc = float(random.choice([0, 1, 2]))
        hour = float(random.randint(0, 23))
    elif pattern == "low_kyc":
        doc_count = float(random.choice([1, 2, 3]))
        has_ownership = 1.0 if random.random() < 0.3 else 0.0
        kyc = 0.0
    elif pattern == "conflict":
        doc_count = float(random.choice([2, 3]))
        has_ownership = 1.0 if random.random() < 0.5 else 0.0
        conflict = 1.0
        kyc = float(random.choice([0, 1, 2]))
        hour = float(random.randint(0, 23))
    elif pattern == "odd_hour":
        doc_count = float(random.choice([1, 2, 3]))
        has_ownership = 1.0 if random.random() < 0.4 else 0.0
        has_sale = 1.0 if random.random() < 0.3 else 0.0
        hour = float(random.choice([0, 1, 2, 3, 4, 5, 23]))
    elif pattern == "subtle":
        # Subtle fraud: looks almost legit but with key red flags
        doc_count = float(random.choice([2, 3, 4]))
        has_ownership = 1.0 if random.random() < 0.6 else 0.0
        has_sale = 1.0 if random.random() < 0.5 else 0.0
        has_tax = 1.0 if random.random() < 0.4 else 0.0
        kyc = float(random.choice([1, 2]))
        conflict = 1.0 if random.random() < 0.3 else 0.0
        hour = float(random.choice(range(7, 22)))  # normal hours!
        val = random.uniform(5_000_000, 150_000_000)
        val_log = math.log10(val + 1)
    else:  # combo — worst of everything
        doc_count = 0.0
        conflict = 1.0
        kyc = 0.0
        hour = float(random.choice([1, 2, 3]))

    return [doc_count, has_ownership, has_sale, has_tax, kyc, conflict, hour, val_log, 1.0]


def main():
    random.seed(SEED)

    n_fraud = int(N_SAMPLES * FRAUD_RATIO)
    n_legit = N_SAMPLES - n_fraud

    dataset = []
    for _ in range(n_legit):
        dataset.append(generate_legitimate())
    for _ in range(n_fraud):
        dataset.append(generate_fraudulent())

    random.shuffle(dataset)

    with open(OUTPUT_PATH, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(FEATURE_NAMES)
        for row in dataset:
            writer.writerow([f"{v:.4f}" for v in row])

    print(f"✅ Generated {N_SAMPLES} samples → {OUTPUT_PATH}")
    print(f"   Legitimate: {n_legit} ({n_legit/N_SAMPLES*100:.0f}%)")
    print(f"   Fraudulent: {n_fraud} ({n_fraud/N_SAMPLES*100:.0f}%)")

    # Quick class balance check
    labels = [row[-1] for row in dataset]
    print(f"   Class 0 (legit):  {labels.count(0.0)}")
    print(f"   Class 1 (fraud):  {labels.count(1.0)}")


if __name__ == "__main__":
    main()
