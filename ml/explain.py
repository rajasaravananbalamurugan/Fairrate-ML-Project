"""
FAIRRATE — SHAP Explainability Module
Computes SHAP values and maps them to plain-English reason sentences.

Used by the FastAPI backend to explain per-prediction top-3 reasons.
"""

import numpy as np
import shap

# ─────────────────────────────────────────────
# Plain-English feature labels
# ─────────────────────────────────────────────
FEATURE_LABELS = {
    "credit_score":             "Credit Score",
    "annual_income_lakh":       "Annual Income (₹ Lakhs)",
    "loan_amount_lakh":         "Loan Amount (₹ Lakhs)",
    "tenure_years":             "Loan Tenure (Years)",
    "ltv_ratio":                "LTV Ratio",
    "existing_obligations_pct": "Existing EMI Obligations (%)",
    "loan_type":                "Loan Type",
    "bank":                     "Bank",
    "employment_type":          "Employment Type",
}

# Templates for positive vs. negative SHAP contribution
REASON_TEMPLATES = {
    "credit_score": {
        "positive": "Low credit score ({val}) significantly increases your rate.",
        "negative": "Strong credit score ({val}) is helping keep your rate lower.",
    },
    "annual_income_lakh": {
        "positive": "Lower income (₹{val}L/yr) adds a risk premium to your rate.",
        "negative": "Higher income (₹{val}L/yr) reduces perceived risk.",
    },
    "loan_amount_lakh": {
        "positive": "Higher loan amount (₹{val}L) increases risk exposure.",
        "negative": "Smaller loan amount (₹{val}L) reduces lender risk.",
    },
    "tenure_years": {
        "positive": "Longer tenure ({val} yrs) increases interest rate risk.",
        "negative": "Shorter tenure ({val} yrs) reduces lender exposure.",
    },
    "ltv_ratio": {
        "positive": "High LTV ratio ({val:.0%}) means less collateral cushion.",
        "negative": "Low LTV ratio ({val:.0%}) — you have strong collateral coverage.",
    },
    "existing_obligations_pct": {
        "positive": "High existing obligations ({val}% of income) signals repayment stress.",
        "negative": "Low existing obligations ({val}% of income) shows healthy finances.",
    },
    "loan_type": {
        "positive": "Personal loans carry higher rates by nature.",
        "negative": "This loan type typically attracts lower interest rates.",
    },
    "bank": {
        "positive": "This bank applies a slightly higher spread for this loan profile.",
        "negative": "This bank offers competitive rates for your profile.",
    },
    "employment_type": {
        "positive": "Self-employed / business borrowers carry higher income variability risk.",
        "negative": "Salaried employment reduces income uncertainty for lenders.",
    },
}

DEFAULT_POSITIVE = "This factor is pushing your rate higher."
DEFAULT_NEGATIVE = "This factor is helping bring your rate down."


def _format_val(feature: str, value) -> str:
    """Format feature value for human display."""
    try:
        if feature == "ltv_ratio":
            return f"{float(value):.0%}"
        elif feature in ("credit_score", "tenure_years"):
            return str(int(float(value)))
        elif feature in ("annual_income_lakh", "loan_amount_lakh"):
            return f"{float(value):.1f}"
        elif feature == "existing_obligations_pct":
            return f"{float(value):.1f}"
        return str(value)
    except Exception:
        return str(value)


def shap_to_reasons(shap_values: np.ndarray, feature_names: list, input_values: list, top_n: int = 3) -> list:
    """
    Convert raw SHAP values into top-N human-readable reason strings.

    Args:
        shap_values:   1D array of SHAP values for one prediction.
        feature_names: Ordered list of feature names matching shap_values.
        input_values:  Ordered list of actual feature values for this row.
        top_n:         Number of top reasons to return.

    Returns:
        List of dicts: [{feature, label, shap_value, direction, reason}]
    """
    # Rank by absolute SHAP value descending
    indices = np.argsort(np.abs(shap_values))[::-1][:top_n]

    reasons = []
    for idx in indices:
        feat = feature_names[idx]
        shap_val = shap_values[idx]
        raw_val = input_values[idx]
        direction = "positive" if shap_val > 0 else "negative"
        label = FEATURE_LABELS.get(feat, feat.replace("_", " ").title())

        templates = REASON_TEMPLATES.get(feat, {})
        template = templates.get(direction, DEFAULT_POSITIVE if direction == "positive" else DEFAULT_NEGATIVE)

        try:
            if "val" in template:
                formatted_val = _format_val(feat, raw_val)
                reason = template.replace("{val}", formatted_val).replace("{val:.0%}", _format_val(feat, raw_val)).replace("{val:.1f}", formatted_val)
        except Exception:
            reason = template

        reasons.append({
            "feature": feat,
            "label": label,
            "shap_value": round(float(shap_val), 4),
            "direction": direction,
            "reason": reason,
        })

    return reasons


def get_shap_explainer(model):
    """Create a SHAP TreeExplainer for the given sklearn tree-based model."""
    regressor = model.named_steps["regressor"]
    preprocessor = model.named_steps["preprocessor"]
    return shap.TreeExplainer(regressor), preprocessor


def explain_prediction(model, X_input: np.ndarray, feature_names: list, top_n: int = 3) -> list:
    """
    Full explanation pipeline: preprocess → SHAP → human reasons.

    Args:
        model:         Fitted sklearn Pipeline (preprocessor + regressor).
        X_input:       DataFrame (1 row) with raw feature values.
        feature_names: List of feature names in X_input column order.
        top_n:         How many top reasons to return.

    Returns:
        List of reason dicts.
    """
    import pandas as pd

    preprocessor = model.named_steps["preprocessor"]
    regressor    = model.named_steps["regressor"]

    X_transformed = preprocessor.transform(X_input)

    explainer = shap.TreeExplainer(regressor)
    shap_values = explainer.shap_values(X_transformed)

    if shap_values.ndim == 2:
        shap_row = shap_values[0]
    else:
        shap_row = shap_values

    # Get feature names after transformation
    try:
        ohe = preprocessor.named_transformers_["cat"].named_steps["ohe"]
        cat_names = list(ohe.get_feature_names_out(
            ["loan_type", "bank", "employment_type"]
        ))
        num_names = ["credit_score", "annual_income_lakh", "loan_amount_lakh",
                     "tenure_years", "ltv_ratio", "existing_obligations_pct"]
        transformed_feature_names = cat_names + num_names
    except Exception:
        transformed_feature_names = [f"feat_{i}" for i in range(len(shap_row))]

    # Map OHE back to original features for SHAP aggregation
    # Aggregate SHAP values by original feature
    agg_shap = {}
    agg_vals = {}

    # Categorical (OHE) features — use raw input values
    for col in ["loan_type", "bank", "employment_type"]:
        relevant = [i for i, n in enumerate(transformed_feature_names) if n.startswith(col + "_")]
        if relevant:
            agg_shap[col] = float(np.sum(shap_row[relevant]))
            val = X_input[col].iloc[0] if hasattr(X_input, "iloc") else X_input[col]
            agg_vals[col] = val

    # Numerical features
    num_features_ordered = ["credit_score", "annual_income_lakh", "loan_amount_lakh",
                             "tenure_years", "ltv_ratio", "existing_obligations_pct"]
    for feat in num_features_ordered:
        indices_in_transformed = [i for i, n in enumerate(transformed_feature_names) if n == feat]
        if indices_in_transformed:
            agg_shap[feat] = float(shap_row[indices_in_transformed[0]])
            val = X_input[feat].iloc[0] if hasattr(X_input, "iloc") else X_input[feat]
            agg_vals[feat] = val

    # Sort by absolute value and pick top_n
    sorted_feats = sorted(agg_shap.items(), key=lambda x: abs(x[1]), reverse=True)[:top_n]

    reasons = []
    for feat, shap_val in sorted_feats:
        direction = "positive" if shap_val > 0 else "negative"
        label = FEATURE_LABELS.get(feat, feat.replace("_", " ").title())
        raw_val = agg_vals.get(feat, "")

        templates = REASON_TEMPLATES.get(feat, {})
        template = templates.get(direction, DEFAULT_POSITIVE if direction == "positive" else DEFAULT_NEGATIVE)

        try:
            formatted = _format_val(feat, raw_val)
            reason = template.replace("{val}", formatted)
        except Exception:
            reason = template

        reasons.append({
            "feature": feat,
            "label": label,
            "shap_value": round(shap_val, 4),
            "direction": direction,
            "reason": reason,
        })

    return reasons


def get_shap_waterfall(model, X_input, feature_names: list) -> dict:
    """
    Computes waterfall data for SHAP visualization.
    Returns:
        {
            "base_value": float,
            "waterfall": [
                {
                    "feature": str,
                    "display_label": str,
                    "shap_value": float,
                    "raw_value": str,
                    "direction": "up" | "down"
                }
            ]
        }
    Ordered from most negative to most positive SHAP value.
    """
    preprocessor = model.named_steps["preprocessor"]
    regressor    = model.named_steps["regressor"]

    X_transformed = preprocessor.transform(X_input)
    explainer = shap.TreeExplainer(regressor)
    shap_values = explainer.shap_values(X_transformed)

    base_val = explainer.expected_value
    if isinstance(base_val, (np.ndarray, list)):
        base_value = float(base_val[0])
    else:
        base_value = float(base_val)

    if shap_values.ndim == 2:
        shap_row = shap_values[0]
    else:
        shap_row = shap_values

    # Get feature names after transformation
    try:
        ohe = preprocessor.named_transformers_["cat"].named_steps["ohe"]
        cat_names = list(ohe.get_feature_names_out(
            ["loan_type", "bank", "employment_type"]
        ))
        num_names = ["credit_score", "annual_income_lakh", "loan_amount_lakh",
                     "tenure_years", "ltv_ratio", "existing_obligations_pct"]
        transformed_feature_names = cat_names + num_names
    except Exception:
        transformed_feature_names = [f"feat_{i}" for i in range(len(shap_row))]

    agg_shap = {}
    agg_vals = {}

    for col in ["loan_type", "bank", "employment_type"]:
        relevant = [i for i, n in enumerate(transformed_feature_names) if n.startswith(col + "_")]
        if relevant:
            agg_shap[col] = float(np.sum(shap_row[relevant]))
            val = X_input[col].iloc[0] if hasattr(X_input, "iloc") else X_input[col]
            agg_vals[col] = val

    num_features_ordered = ["credit_score", "annual_income_lakh", "loan_amount_lakh",
                             "tenure_years", "ltv_ratio", "existing_obligations_pct"]
    for feat in num_features_ordered:
        indices_in_transformed = [i for i, n in enumerate(transformed_feature_names) if n == feat]
        if indices_in_transformed:
            agg_shap[feat] = float(shap_row[indices_in_transformed[0]])
            val = X_input[feat].iloc[0] if hasattr(X_input, "iloc") else X_input[feat]
            agg_vals[feat] = val

    # Order from most negative to most positive SHAP value
    sorted_items = sorted(agg_shap.items(), key=lambda x: x[1])

    waterfall_items = []
    for feat, shap_val in sorted_items:
        direction = "up" if shap_val > 0 else "down"
        display_label = FEATURE_LABELS.get(feat, feat.replace("_", " ").title())
        raw_val = _format_val(feat, agg_vals.get(feat, ""))
        waterfall_items.append({
            "feature": feat,
            "display_label": display_label,
            "shap_value": round(float(shap_val), 4),
            "raw_value": str(raw_val),
            "direction": direction,
        })

    return {
        "base_value": round(base_value, 2),
        "waterfall": waterfall_items,
    }
