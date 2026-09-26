# FAIRRATE — ML Loan Interest Rate Fairness Checker

> **Is your bank charging you too much?** FAIRRATE uses machine learning trained on Indian bank rate cards to predict a fair interest rate for your loan profile and flags whether you're getting a fair deal, a high rate, or a red flag.

---

## 🏗️ Project Structure

```
fairrate/
├── data/
│   ├── generate_data.py      # Synthetic dataset generator
│   └── loan_data.csv         # Generated dataset (after running step 1)
├── ml/
│   ├── train.py              # Model training pipeline (RF + GB comparison)
│   ├── evaluate.py           # Detailed evaluation metrics
│   └── explain.py            # SHAP explainability module
├── models/
│   ├── model.pkl             # Best trained model (after step 2)
│   ├── preprocessor.pkl      # Fitted preprocessor
│   └── model_meta.json       # Model metadata
├── backend/
│   ├── main.py               # FastAPI app
│   ├── schemas.py            # Pydantic request/response models
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main React app
│   │   ├── components/
│   │   │   ├── LoanForm.jsx  # Borrower profile form
│   │   │   ├── VerdictCard.jsx  # Result verdict display
│   │   │   ├── RateTable.jsx    # Bank benchmark table
│   │   │   └── ReasonsList.jsx  # SHAP reasons
│   │   └── api.js            # Axios API client
│   └── vite.config.js
└── README.md
```

---

## 🚀 Setup Instructions

### Prerequisites

- Python 3.9+
- Node.js 18+
- pip

---

### Step 1: Generate Synthetic Dataset

```bash
cd fairrate
python data/generate_data.py
```

This creates `data/loan_data.csv` with 5,000 synthetic loan records built from RBI base rates and Indian bank spread logic.

---

### Step 2: Install Python Dependencies

```bash
pip install -r backend/requirements.txt
```

---

### Step 3: Train the ML Model

```bash
python ml/train.py
```

This will:
- Train a **Random Forest Regressor** and **Gradient Boosting Regressor**
- Print a comparison table (RMSE, MAE, R²)
- Save the best model to `models/model.pkl`
- Save the fitted preprocessor to `models/preprocessor.pkl`

Optional — run detailed evaluation:

```bash
python ml/evaluate.py
```

---

### Step 4: Start the FastAPI Backend

```bash
# From the fairrate/ root directory
uvicorn backend.main:app --reload --port 8000
```

The API will be available at:
- 🌐 `http://localhost:8000`
- 📚 Docs: `http://localhost:8000/docs`
- ❤️ Health: `http://localhost:8000/health`

---

### Step 5: Start the React Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/predict` | Predict fair rate + verdict + SHAP reasons |
| `GET`  | `/health` | Health check |
| `GET`  | `/banks` | Supported banks list |
| `GET`  | `/loan-types` | Supported loan types |

### Example Request

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "loan_type": "personal",
    "bank": "HDFC",
    "credit_score": 720,
    "annual_income_lakh": 12.0,
    "employment_type": "salaried",
    "loan_amount_lakh": 5.0,
    "tenure_years": 3,
    "ltv_ratio": null,
    "existing_obligations_pct": 20.0,
    "offered_rate": 13.5
  }'
```

### Example Response

```json
{
  "fair_rate": 12.34,
  "offered_rate": 13.5,
  "difference": 1.16,
  "verdict": "HIGH",
  "verdict_emoji": "⚠️",
  "message": "Your offered rate is 1.16% above the fair rate of 12.34%.",
  "explainer": "Your bank is offering 13.50%, but our model estimates...",
  "top_reasons": [
    {
      "feature": "credit_score",
      "label": "Credit Score",
      "shap_value": 0.45,
      "direction": "positive",
      "reason": "Low credit score (720) significantly increases your rate."
    }
  ],
  "benchmark_rates": [...],
  "model_name": "Gradient Boosting Regressor"
}
```

---

## 🤖 ML Model Details

### Dataset

- **5,000 synthetic records** generated from RBI base rates + bank spread logic
- Features: loan_type, bank, credit_score, annual_income_lakh, employment_type, loan_amount_lakh, tenure_years, ltv_ratio, existing_obligations_pct
- Target: `fair_rate` (% per annum)

### Rate Logic

| Factor | Impact |
|--------|--------|
| Credit score ≥ 750 | No spread |
| Credit score 700–749 | +0.75% |
| Credit score 650–699 | +1.5% |
| Credit score < 650 | +3.0% |
| Self-employed | +0.5% |
| Business owner | +1.0% |
| LTV > 85% | +1.5% |
| Obligations > 50% income | +1.5% |

### Models Compared

| Model | Typical RMSE | Notes |
|-------|-------------|-------|
| Random Forest Regressor | ~0.25% | Fast, robust to outliers |
| Gradient Boosting Regressor | ~0.22% | Usually wins on RMSE |

### Explainability

SHAP (SHapley Additive exPlanations) `TreeExplainer` is used to generate per-prediction feature attributions, aggregated back to original features (before one-hot encoding).

---

## ⚙️ Configuration

Verdict thresholds are configurable in `backend/main.py`:

```python
VERDICT_FAIR_THRESHOLD = 0.5   # ≤ 0.5% above fair → FAIR
VERDICT_HIGH_THRESHOLD = 1.5   # ≤ 1.5% above fair → HIGH (else RED FLAG)
```

---

## 📌 Supported Loan Types & Banks

**Loan Types:** Personal · Home · Car · Education

**Banks:** SBI · HDFC · ICICI · Axis · Kotak

---

## ⚠️ Disclaimer

This tool is for **educational purposes only**. Rate predictions are based on synthetic data derived from publicly available bank rate cards. This is **not financial advice**. Always consult a certified financial advisor before taking any loan.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Data | Python, NumPy, Pandas |
| ML | scikit-learn (Random Forest, Gradient Boosting) |
| Explainability | SHAP TreeExplainer |
| Backend | FastAPI + Uvicorn + Pydantic |
| Frontend | React + Vite + Tailwind CSS |
| API Client | Axios |
