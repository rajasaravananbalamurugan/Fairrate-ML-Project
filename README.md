# ⚖️ FAIRRATE — AI-Powered Loan Rate Fairness Suite

> **Is your bank's interest rate fair or inflated?**  
> FAIRRATE uses a scikit-learn Gradient Boosting model with SHAP explainability, trained on real Indian lending rate data, to help borrowers understand if the rate they have been offered is competitive.

[![License: MIT](https://img.shields.io/badge/License-MIT-indigo.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688.svg)](https://fastapi.tiangolo.com)

---

## 🚀 What It Does

FAIRRATE is a full-stack ML application with **4 feature groups** and **20 UI sections** that help Indian borrowers:

1. **Analyze** — Submit your loan profile, get an ML-predicted fair rate, SHAP explanation, and bank comparison
2. **Plan** — Calculate EMI & prepayment schedules, compare balance transfer savings, compute true APR, and simulate repo-rate linked products
3. **Tools** — Upload your offer letter for AI parsing, generate an AI negotiation script, chat with a loan assistant, and share results
4. **Model Lab** — Inspect the ML model for fairness, compare model versions, view prediction intervals, and monitor data drift

---

## 🏗️ Project Structure

```
fairrate/
├── backend/                    # FastAPI REST API
│   ├── main.py                 # 15 API endpoints (predict, plan, tools, model-lab)
│   ├── schemas.py              # Pydantic request/response models
│   ├── financial_math.py       # EMI, APR, prepayment, balance-transfer calculations
│   ├── tools_service.py        # Groq LLM integration (negotiation script, chat, OCR)
│   ├── requirements.txt        # Python dependencies
│   └── Dockerfile              # Backend container
│
├── frontend/                   # React 18 + Vite SPA
│   ├── src/
│   │   ├── App.jsx             # Main app shell, grouped navigation, login gate
│   │   ├── api.js              # Axios API client
│   │   ├── i18n.js             # Translations (English, Tamil, Hindi)
│   │   ├── index.css           # Design system (glassmorphism, tokens, animations)
│   │   └── components/
│   │       ├── LoginPage.jsx             # Login gate (name + email, no password)
│   │       ├── LoanForm.jsx              # Loan profile input form (all-manual)
│   │       ├── VerdictCard.jsx           # Rate fairness verdict + EMI summary
│   │       ├── ShapWaterfall.jsx         # SHAP feature impact waterfall chart
│   │       ├── WhatIfSimulator.jsx       # What-If rate simulator (sliders)
│   │       ├── BankComparison.jsx        # 11-bank rate comparison table
│   │       ├── PrepaymentCalculator.jsx  # EMI & prepayment planner + chart
│   │       ├── BalanceTransferCalculator.jsx  # Balance transfer savings
│   │       ├── AprCalculator.jsx         # True cost / APR calculator
│   │       ├── RepoSimulator.jsx         # Repo-linked rate simulator
│   │       ├── CreditImprovementPlanner.jsx   # Credit score improvement plan
│   │       ├── OfferParser.jsx           # Upload & parse offer letter (AI OCR)
│   │       ├── AiNegotiationScript.jsx   # AI-generated negotiation script
│   │       ├── ChatAssistant.jsx         # Loan Q&A chat assistant (Groq LLM)
│   │       ├── ShareResultModal.jsx      # Share rate verdict
│   │       ├── FairnessAuditView.jsx     # Model fairness across demographics
│   │       ├── ModelComparisonView.jsx   # ML model version comparison
│   │       ├── PredictionIntervalsView.jsx  # Quantile prediction intervals
│   │       ├── DataSourcesView.jsx       # Training data provenance
│   │       └── DriftMonitorView.jsx      # Feature distribution drift monitor
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
│
├── ml/                         # ML pipeline scripts
│   ├── train.py                # Train Gradient Boosting + save artifacts
│   ├── explain.py              # SHAP explainer + waterfall generator
│   ├── fairness_audit.py       # Demographic fairness metrics
│   ├── drift_check.py          # Feature drift detection (PSI / KS)
│   └── load_real_data.py       # Load real RBI rate card data
│
├── data/
│   ├── generate_data.py        # Synthetic training data generator
│   └── real_rate_cards.csv     # Real Indian bank rate card data
│
├── models/                     # Saved ML model artifacts (git-ignored)
│   ├── model.pkl               # Trained GradientBoostingRegressor
│   ├── preprocessor.pkl        # Fitted ColumnTransformer
│   └── model_meta.json         # Version, metrics, feature list
│
├── tests/                      # pytest test suite
│   ├── test_api.py             # API endpoint integration tests
│   └── test_financial_math.py  # Financial calculation unit tests
│
├── config/
│   └── rate_cards.json         # Bank-wise rate card config
│
├── .github/
│   └── workflows/ci.yml        # GitHub Actions CI pipeline
├── docker-compose.yml          # Full stack: frontend + backend + nginx
├── render.yaml                 # Render.com deployment blueprint
├── check_system.py             # System health check (15 endpoint tests)
└── README.md
```

---

## 🔐 Login & Session

The app opens with a **login screen** that collects the user Full Name and Email Address before granting access. This ensures:
- Users enter their own real loan data (no pre-filled example values or presets)
- The session is entirely client-side (no database, no auth server)
- User name and avatar appear in the sidebar with a Sign Out button
- On sign out, all loan data is cleared and the login screen is shown again

---

## 📋 Feature Sections

### 🔍 Analyze Group

**Loan Profile** — Enter your loan type, bank, credit score, income, employment, loan amount, tenure, LTV, existing obligations, and offered rate. All fields are user-entered (no presets or example personas).

**Rate Verdict** — The ML model predicts a fair rate and compares it to your offered rate. Shows rate spread (over/under), confidence band (p10–p90), quick EMI summary, and a color-coded verdict badge (Excellent / Fair / Slightly High / Overpriced).

**Why (SHAP)** — A waterfall chart showing exactly which features pushed your rate up or down from the model base rate. Powered by SHAP TreeExplainer.

**Compare** — Side-by-side table of estimated rates from 11 Indian banks and NBFCs for your exact profile, sorted from cheapest to most expensive.

**What-If** — Interactive sliders to simulate how improving your credit score, reducing loan amount, or changing tenure would affect your predicted rate.

### 📈 Plan Group

**EMI & Prepayment** — Full reducing-balance EMI schedule. Shows interest saved by making extra lump-sum or monthly prepayments, with an amortization chart.

**Balance Transfer** — Enter your current outstanding balance, remaining tenure, and current rate vs a new lender rate. Shows break-even months, total savings, and net benefit after processing fees.

**True Cost (APR)** — Computes the effective APR by incorporating processing fees, insurance premiums, and other charges. Shows the hidden cost vs nominal rate.

**Repo-Linked Rates** — Simulates how an EBLR (External Benchmark Linked Rate) loan would behave across different RBI repo rate scenarios. Helps borrowers decide between fixed and floating rate products.

**Credit Improvement Planner** — Generates a personalized action plan (pay down credit utilization, dispute errors, avoid hard inquiries) with estimated CIBIL score improvement timeline.

### 🛠️ Tools Group

**Upload Offer Letter** — Upload your bank sanction letter (PDF or image). The AI extracts loan amount, rate, tenure, processing fee, and pre-payment terms automatically.

**AI Negotiation Script** — Generates a professional, personalized negotiation letter you can send or speak to your bank relationship manager, leveraging your SHAP factors as arguments. Powered by Groq LLM.

**Chat Assistant** — A conversational AI (powered by Groq) that answers questions about your specific loan profile, EMI, prepayment strategies, and interest rate fairness in plain language.

**Share Result** — Generate a shareable summary of your rate verdict to share with a financial advisor or family.

### 🔬 Model Lab Group

**Fairness Audit** — Evaluates the model for demographic bias across income quartiles, employment types, and loan types. Reports Equalized Odds, Demographic Parity, and Equal Opportunity metrics.

**Model Comparison** — Compare current production model vs a challenger model on accuracy (MAE, RMSE), calibration, and fairness metrics.

**Prediction Intervals** — Displays bootstrap-derived 80% and 95% prediction intervals for the current input profile. Shows model uncertainty visually.

**Data Sources** — Documents the training data provenance: synthetic data generation, real RBI/NHB rate circulars used for calibration, and data versioning.

**Drift Monitor** — Monitors feature distributions in live predictions vs training data. Reports Population Stability Index (PSI) and KS-test p-values per feature to detect model staleness.

---

## 🧠 ML Model

| Component | Detail |
|-----------|--------|
| **Algorithm** | GradientBoostingRegressor (scikit-learn) |
| **Target** | Fair interest rate (% p.a.) |
| **Features** | Loan type, bank, credit score, income, employment type, loan amount, tenure, LTV ratio, existing obligations |
| **Explainability** | SHAP TreeExplainer waterfall and bar charts |
| **Quantile Prediction** | 10th / 50th / 90th percentile via separate quantile regressors |
| **Fairness Metrics** | Equalized Odds across income quartiles and employment type |
| **Training Data** | Synthetic data calibrated to RBI / NHB rate circulars and real bank rate cards |

---

## 🔌 API Endpoints

### Analyze
| Method | Path | Description |
|--------|------|-------------|
| POST | /predict | Standard ML rate prediction |
| POST | /predict-v2 | Quantile prediction with confidence intervals |

### Plan
| Method | Path | Description |
|--------|------|-------------|
| POST | /plan/prepayment | EMI schedule + prepayment impact |
| POST | /plan/balance-transfer | Balance transfer savings analysis |
| POST | /plan/apr | True APR / effective cost of loan |
| POST | /plan/repo-rate | Repo-linked loan simulator |
| POST | /plan/credit-improvement | Credit score improvement roadmap |

### Tools
| Method | Path | Description |
|--------|------|-------------|
| POST | /tools/parse-offer | AI OCR parsing of offer letter PDF/image |
| POST | /tools/negotiation-script | Groq LLM negotiation script generator |
| POST | /tools/chat | Loan Q&A chat assistant |

### Model Lab
| Method | Path | Description |
|--------|------|-------------|
| GET | /model/registry | Active model version + metrics |
| POST | /model/fairness-audit | Fairness metrics across subgroups |
| POST | /model/compare | Compare two model versions |
| POST | /model/prediction-intervals | Bootstrap prediction intervals |
| GET | /model/drift | Feature distribution drift report |

---

## ⚙️ Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Groq API Key (https://console.groq.com) — for AI features

### 1. Clone

```bash
git clone https://github.com/rajasaravananbalamurugan/Fairrate-ML-Project.git
cd Fairrate-ML-Project
```

### 2. Backend

```bash
python -m venv venv
.\venv\Scripts\activate

pip install -r backend/requirements.txt

cp .env.example .env
# Edit .env and add GROQ_API_KEY=gsk_...

python ml/train.py

python -m uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — you will see the login screen first.

### 4. Docker Compose (full stack)

```bash
docker-compose up --build
```

---

## 🌍 Deployment

- **Backend** — Render.com Web Service (render.yaml)
- **Frontend** — Vercel (frontend/vercel.json)

---

## 🧪 Tests

```bash
pytest tests/ -v
python check_system.py
```

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Vanilla CSS (glassmorphism) |
| Internationalisation | react-i18next (EN / Tamil / Hindi) |
| Charts | Recharts |
| Backend | FastAPI |
| ML | scikit-learn GradientBoostingRegressor |
| Explainability | SHAP TreeExplainer |
| LLM | Groq API (openai/gpt-oss-120b) |
| HTTP Client | Axios |
| Containerisation | Docker + Docker Compose |
| CI/CD | GitHub Actions |

---

## ⚠️ Disclaimer

FAIRRATE is for **educational and informational purposes only**. It does not constitute financial advice. Rate predictions are model estimates. Always consult a certified financial advisor before making loan decisions.

---

## 📄 License

MIT © 2024 Rajasaravanan Balamurugan
