"""
FAIRRATE — Real Rate Card Loader & Calibration Module
Reads data/real_rate_cards.csv, provides lookup bounds, and calibrates synthetic generation.
"""

import os
import sys
import pandas as pd
from typing import Dict, Tuple, List, Optional

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RATE_CARDS_CSV = os.path.join(BASE_DIR, "data", "real_rate_cards.csv")

# In-memory cached lookup table
_rate_cards_df: Optional[pd.DataFrame] = None
_rate_bounds_cache: Dict[Tuple[str, str], Tuple[float, float]] = {}


def load_rate_cards() -> pd.DataFrame:
    """Loads and validates data/real_rate_cards.csv."""
    global _rate_cards_df, _rate_bounds_cache
    if _rate_cards_df is not None:
        return _rate_cards_df

    if not os.path.exists(RATE_CARDS_CSV):
        raise FileNotFoundError(f"Rate cards file not found at: {RATE_CARDS_CSV}")

    df = pd.read_csv(RATE_CARDS_CSV)
    df["bank"] = df["bank"].astype(str).str.strip()
    df["loan_type"] = df["loan_type"].astype(str).str.strip().str.lower()
    df["min_rate"] = df["min_rate"].astype(float)
    df["max_rate"] = df["max_rate"].astype(float)
    df["is_verified"] = df["is_verified"].astype(bool)

    _rate_bounds_cache.clear()
    for _, row in df.iterrows():
        key = (row["bank"], row["loan_type"])
        _rate_bounds_cache[key] = (row["min_rate"], row["max_rate"])

    _rate_cards_df = df
    return _rate_cards_df


def get_rate_bounds(bank: str, loan_type: str, fallback_bounds: Tuple[float, float] = (8.5, 18.0)) -> Tuple[float, float]:
    """Returns (min_rate, max_rate) for a given bank and loan_type."""
    if not _rate_bounds_cache:
        load_rate_cards()
    key = (bank.strip(), loan_type.strip().lower())
    return _rate_bounds_cache.get(key, fallback_bounds)


def calibrate_synthetic_rate(raw_rate: float, bank: str, loan_type: str) -> float:
    """
    Clips and calibrates a generated rate within real published rate card boundaries.
    Ensures synthetic samples never fall outside realistic Indian lending bounds.
    """
    min_rate, max_rate = get_rate_bounds(bank, loan_type)
    # Allow small realistic headroom for extreme credit spreads
    clamped = max(min_rate - 0.25, min(max_rate + 0.75, raw_rate))
    return round(clamped, 2)


def get_data_sources_summary() -> List[Dict]:
    """Returns a serializable list of rate card data sources with verification status."""
    df = load_rate_cards()
    records = []
    for _, r in df.iterrows():
        records.append({
            "bank": r["bank"],
            "loan_type": r["loan_type"],
            "min_rate": float(r["min_rate"]),
            "max_rate": float(r["max_rate"]),
            "source_url": str(r["source_url"]),
            "date_collected": str(r["date_collected"]),
            "notes": str(r["notes"]),
            "is_verified": bool(r["is_verified"]),
        })
    return records


if __name__ == "__main__":
    df = load_rate_cards()
    verified_count = df["is_verified"].sum()
    placeholder_count = len(df) - verified_count
    print("=" * 60)
    print(f"FAIRRATE Real Rate Cards: {len(df)} total records loaded")
    print(f"  ✓ Verified Official Bank Cards: {verified_count}")
    print(f"  ⚠️ Placeholder Records Pending Verification: {placeholder_count}")
    print("=" * 60)
    print(df.head(10)[["bank", "loan_type", "min_rate", "max_rate", "is_verified"]])
