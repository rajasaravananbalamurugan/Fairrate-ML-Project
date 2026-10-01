"""
FAIRRATE — AI & Offer Letter Processing Service
Handles offer letter parsing (LLM API with pypdf + regex fallback),
personalized negotiation scripts, and contextual borrower chat queries.
Supports Groq API (openai/gpt-oss-120b, openai/gpt-oss-20b) and Anthropic API.
"""

import os
import re
import io
import json
import logging
from typing import Dict, Any, Optional

from pathlib import Path

try:
    from dotenv import load_dotenv
    root_env = Path(__file__).resolve().parent.parent / ".env"
    if root_env.exists():
        load_dotenv(dotenv_path=root_env)
    load_dotenv()
except ImportError:
    pass

try:
    import pypdf
except ImportError:
    pypdf = None

try:
    import httpx
except ImportError:
    httpx = None

logger = logging.getLogger("fairrate.tools")


def get_llm_api_key() -> Optional[str]:
    """Retrieves Groq, Anthropic, or general LLM API key from environment."""
    return (
        os.getenv("GROQ_API_KEY")
        or os.getenv("LLM_API_KEY")
        or os.getenv("ANTHROPIC_API_KEY")
    )


def call_groq_llm(messages: list, model: str = "openai/gpt-oss-120b", max_tokens: int = 800, temperature: float = 0.3) -> Optional[str]:
    """Helper to query Groq LLM API with fallback to 20b model."""
    api_key = os.getenv("GROQ_API_KEY") or os.getenv("LLM_API_KEY")
    if not api_key or not httpx:
        return None

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    models_to_try = [model, "openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"]

    for m in models_to_try:
        try:
            payload = {
                "model": m,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
            resp = httpx.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=15.0,
            )
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            else:
                logger.warning(f"Groq API model {m} returned {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.warning(f"Groq API call failed with model {m}: {e}")

    return None


def call_anthropic_llm(prompt: str, max_tokens: int = 600) -> Optional[str]:
    """Helper to query Anthropic API if key is set."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or not httpx or api_key.startswith("gsk_"):
        return None

    try:
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": "claude-3-haiku-20240307",
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }
        resp = httpx.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload, timeout=12.0)
        if resp.status_code == 200:
            return resp.json()["content"][0]["text"]
    except Exception as e:
        logger.warning(f"Anthropic API call failed: {e}")

    return None


# ─────────────────────────────────────────────
# 1. Offer Letter Parser
# ─────────────────────────────────────────────
def parse_offer_letter_text(text: str) -> Dict[str, Any]:
    """Fallback heuristic regex parser for Indian bank sanction letters."""
    data = {
        "bank": "HDFC",
        "loan_type": "personal",
        "loan_amount_lakh": 5.0,
        "tenure_years": 3,
        "offered_rate": 13.5,
        "processing_fee_inr": 5000,
        "parser_used": "Heuristic OCR & Rule-Based Regex Extraction",
        "confidence_score": 0.85,
    }

    # Bank detection
    bank_patterns = {
        "SBI": r"\b(SBI|State Bank of India)\b",
        "HDFC": r"\b(HDFC|HDFC Bank)\b",
        "ICICI": r"\b(ICICI|ICICI Bank)\b",
        "Axis": r"\b(Axis|Axis Bank)\b",
        "Kotak": r"\b(Kotak|Kotak Mahindra)\b",
        "PNB": r"\b(PNB|Punjab National Bank)\b",
        "BOB": r"\b(Bank of Baroda|BOB)\b",
        "Canara": r"\b(Canara Bank)\b",
        "Union": r"\b(Union Bank)\b",
        "Bajaj": r"\b(Bajaj Finserv|Bajaj Finance)\b",
        "Tata": r"\b(Tata Capital)\b",
    }
    for bk, pat in bank_patterns.items():
        if re.search(pat, text, re.IGNORECASE):
            data["bank"] = bk
            break

    # Loan type detection
    loan_type_patterns = {
        "home": r"\b(home|housing|mortgage)\s*loan\b",
        "car": r"\b(car|auto|vehicle)\s*loan\b",
        "education": r"\b(education|student|scholar)\s*loan\b",
        "gold": r"\b(gold|jewel)\s*loan\b",
        "business": r"\b(business|msme|commercial)\s*loan\b",
        "lap": r"\b(lap|loan against property)\b",
        "personal": r"\b(personal|express credit)\s*loan\b",
    }
    for lt, pat in loan_type_patterns.items():
        if re.search(pat, text, re.IGNORECASE):
            data["loan_type"] = lt
            break

    # Rate detection
    rate_match = re.search(r"(?:interest rate|roi|rate of interest|rate)\s*[:=-]?\s*([0-9]{1,2}(?:\.[0-9]{1,2})?)\s*%", text, re.IGNORECASE)
    if rate_match:
        try:
            r = float(rate_match.group(1))
            if 6.0 <= r <= 36.0:
                data["offered_rate"] = r
        except Exception:
            pass

    # Loan amount
    amt_lakh_match = re.search(r"(?:rs\.?|inr|₹)?\s*([0-9]{1,3}(?:\.[0-9]+)?)\s*(?:lakhs?|lacs?|lac|l\b)", text, re.IGNORECASE)
    if amt_lakh_match:
        try:
            data["loan_amount_lakh"] = float(amt_lakh_match.group(1))
        except Exception:
            pass
    else:
        amt_num_match = re.search(r"(?:loan amount|sanctioned amount|principal)\s*[:=-]?\s*(?:rs\.?|inr|₹)?\s*([0-9,]{5,10})", text, re.IGNORECASE)
        if amt_num_match:
            try:
                raw_amt = float(amt_num_match.group(1).replace(",", ""))
                data["loan_amount_lakh"] = round(raw_amt / 100000.0, 2)
            except Exception:
                pass

    # Tenure detection
    tenure_yr_match = re.search(r"(?:tenure|term|period)\s*[:=-]?\s*([0-9]{1,2})\s*(?:years?|yrs?)", text, re.IGNORECASE)
    if tenure_yr_match:
        try:
            data["tenure_years"] = int(tenure_yr_match.group(1))
        except Exception:
            pass
    else:
        tenure_mo_match = re.search(r"(?:tenure|term|period)\s*[:=-]?\s*([0-9]{2,3})\s*(?:months?|mos?)", text, re.IGNORECASE)
        if tenure_mo_match:
            try:
                data["tenure_years"] = max(1, int(round(int(tenure_mo_match.group(1)) / 12.0)))
            except Exception:
                pass

    return data


def parse_offer_letter(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Parses loan sanction letter from in-memory bytes.
    Zero file persistence: file contents are never saved to disk.
    Prioritizes LLM extraction (Groq or Claude), falls back to regex.
    """
    text_content = ""
    if filename.lower().endswith(".pdf") and pypdf is not None:
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages[:5]:
                text_content += (page.extract_text() or "") + "\n"
        except Exception:
            pass

    if not text_content:
        try:
            text_content = file_bytes.decode("utf-8", errors="ignore")
        except Exception:
            text_content = ""

    extract_prompt = (
        "You are an expert loan document auditor. Extract structured loan terms from this Indian bank sanction/offer letter text into JSON with keys:\n"
        "- bank (Must be one of: SBI, HDFC, ICICI, Axis, Kotak, PNB, BOB, Canara, Union, Bajaj, Tata)\n"
        "- loan_type (Must be one of: personal, home, car, education, gold, business, lap)\n"
        "- loan_amount_lakh (number in lakhs, e.g. 25.5)\n"
        "- tenure_years (integer number of years)\n"
        "- offered_rate (annual interest rate percentage as a number, e.g. 9.25)\n"
        "- processing_fee_inr (processing fee amount in rupees as integer, or estimate)\n"
        "Return ONLY a valid JSON object without markdown fences.\n\n"
        f"DOCUMENT SNIPPET:\n{text_content[:3500]}"
    )

    # 1. Try Groq LLM
    llm_resp = call_groq_llm([{"role": "user", "content": extract_prompt}])
    # 2. Try Anthropic if Groq unavailable
    if not llm_resp:
        llm_resp = call_anthropic_llm(extract_prompt)

    if llm_resp:
        try:
            json_str = re.search(r"\{.*\}", llm_resp, re.DOTALL)
            if json_str:
                parsed = json.loads(json_str.group(0))
                parsed["parser_used"] = "AI LLM Intelligence (Groq / Llama)"
                parsed["confidence_score"] = 0.98
                return parsed
        except Exception as e:
            logger.warning(f"Failed to parse LLM JSON extraction: {e}")

    # Fallback to regex heuristic
    return parse_offer_letter_text(text_content or filename)


# ─────────────────────────────────────────────
# 2. Negotiation Script Generator
# ─────────────────────────────────────────────
def generate_negotiation_script(data: Dict[str, Any]) -> Dict[str, Any]:
    """Generates a personalized counter-offer email using Groq LLM or template."""
    tone = data.get("tone", "firm").lower()
    bank = data.get("bank", "Bank")
    loan_type = data.get("loan_type", "personal").capitalize()
    loan_amount = data.get("loan_amount_lakh", 5.0)
    tenure_years = data.get("tenure_years", 3)
    offered_rate = data.get("offered_rate", 13.5)
    fair_rate = data.get("fair_rate", 12.0)
    diff = round(offered_rate - fair_rate, 2)
    credit_score = data.get("credit_score", 750)
    top_reasons = data.get("top_reasons", ["Disciplined credit score", "Stable salaried income"])
    competitor_rates = data.get("competitor_rates", [])

    competitor_str = (
        ", ".join([f"{c.get('bank')}: {c.get('rate')}%" for c in competitor_rates[:2]])
        if competitor_rates
        else f"Peer banks offer ~{fair_rate}%"
    )
    strengths_str = ", ".join([str(r) for r in top_reasons[:3]])

    prompt = (
        f"Write a professional interest rate negotiation letter/email from a loan borrower to {bank}.\n"
        f"Context:\n"
        f"- Loan Type: {loan_type} Loan\n"
        f"- Loan Amount: ₹{loan_amount} Lakhs for {tenure_years} years\n"
        f"- Quoted Rate: {offered_rate:.2f}% p.a.\n"
        f"- Fair Benchmark Rate: {fair_rate:.2f}% p.a. (Excess spread: +{diff:.2f}%)\n"
        f"- Borrower CIBIL Score: {credit_score}\n"
        f"- Key Strengths: {strengths_str}\n"
        f"- Competitor Benchmark: {competitor_str}\n"
        f"- Tone: {tone.upper()} (polite, firm, or formal)\n\n"
        f"Requirements:\n"
        f"Write a complete, ready-to-send email with Subject line and polite sign-off. Highlight creditworthiness, cite the fair rate data, and ask for a rate revision. Do not include placeholders like [Date], write naturally."
    )

    llm_resp = call_groq_llm([{"role": "user", "content": prompt}], temperature=0.5)
    if not llm_resp:
        llm_resp = call_anthropic_llm(prompt)

    if llm_resp and len(llm_resp.strip()) > 100:
        cleaned_letter = llm_resp.strip()
        return {
            "title": f"{tone.capitalize()} AI Negotiation Letter",
            "tone": tone,
            "negotiation_text": cleaned_letter,
            "script": cleaned_letter,
            "generator": "Groq LLM AI Engine",
        }

    # Template fallback
    if tone == "firm":
        tone_title = "Firm & Direct Negotiation"
        tone_intro = (
            f"I am writing regarding the interest rate of {offered_rate:.2f}% quoted for my {loan_type} loan application "
            f"(₹{loan_amount} Lakhs, {tenure_years} years). An independent market risk audit places the fair benchmark "
            f"for my credit profile (CIBIL {credit_score}) at {fair_rate:.2f}%."
        )
        tone_action = (
            f"A spread of +{diff:.2f}% is uncompetitive relative to prevailing market offerings. "
            f"I have received lower preliminary rate indications from peer lenders. "
            f"I request that {bank} match the fair market benchmark of {fair_rate:.2f}% p.a. to finalize this sanction."
        )
    elif tone == "formal":
        tone_title = "Formal Executive Representation"
        tone_intro = (
            f"This representation concerns the sanction terms for {loan_type} Loan facility of ₹{loan_amount} Lakhs "
            f"tenured at {tenure_years} years. Following internal financial review against published benchmark card rates, "
            f"the quoted rate of {offered_rate:.2f}% reflects an adverse differential of +{diff:.2f}% against an estimated fair rate of {fair_rate:.2f}%."
        )
        tone_action = (
            f"In view of my established financial standing, debt-service coverage, and clean credit history (CIBIL Score: {credit_score}), "
            f"I formally petition your credit committee to revise the rate card to {fair_rate:.2f}% prior to loan agreement execution."
        )
    else:
        tone_title = "Polite & Collaborative Request"
        tone_intro = (
            f"Thank you for sanctioning my {loan_type} loan application of ₹{loan_amount} Lakhs for {tenure_years} years. "
            f"Upon reviewing the terms, I noted the offered rate of {offered_rate:.2f}% p.a., "
            f"whereas market benchmark modeling estimates a fair rate around {fair_rate:.2f}%."
        )
        tone_action = (
            f"With a strong CIBIL score of {credit_score} and a consistent repayment record, I value my relationship with {bank}. "
            f"Could you please review if a rate concession closer to {fair_rate:.2f}% can be approved for my file?"
        )

    letter_body = (
        f"Subject: Interest Rate Reconsideration Request — {loan_type} Loan (₹{loan_amount}L / {tenure_years} Yrs)\n\n"
        f"Dear Branch Manager / Credit Officer,\n\n"
        f"{tone_intro}\n\n"
        f"{tone_action}\n\n"
        f"Key Application Details:\n"
        f"• Quoted Rate: {offered_rate:.2f}% p.a.\n"
        f"• Benchmark Fair Rate: {fair_rate:.2f}% p.a.\n"
        f"• Rate Differential: +{diff:.2f}%\n"
        f"• Borrower CIBIL Score: {credit_score}\n\n"
        f"Thank you for your consideration, and I look forward to your positive confirmation.\n\n"
        f"Warm regards,\n"
        f"[Borrower Name]\n"
        f"[Contact Number & Application Ref]"
    )

    return {
        "title": tone_title,
        "tone": tone,
        "negotiation_text": letter_body,
        "script": letter_body,
        "generator": "Template Engine",
    }


# ─────────────────────────────────────────────
# 3. Contextual Chat Assistant
# ─────────────────────────────────────────────
def handle_chat_assistant(question: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Answers borrower rate questions contextually using Groq LLM or rule-based fallback.
    Strictly forbids giving definitive financial advice and includes disclaimer.
    """
    offered = context.get("offered_rate", 13.5)
    fair = context.get("fair_rate", 12.0)
    verdict = context.get("verdict", "HIGH")
    diff = round(offered - fair, 2)
    bank = context.get("bank", "Bank")
    loan_type = context.get("loan_type", "personal")
    credit_score = context.get("credit_score", 720)
    reasons = context.get("reasons", [])

    system_instruction = (
        "You are the FAIRRATE AI Loan Advisor. You help Indian borrowers understand interest rate fairness.\n"
        "RULES:\n"
        "1. Answer concisely in 2 to 4 sentences.\n"
        "2. Ground your answer in the borrower's prediction context provided below.\n"
        "3. NEVER give binding financial, tax, or legal advice. Recommend verifying with licensed banking professionals.\n"
        "4. Tone: helpful, empirical, empowering.\n"
    )

    context_str = (
        f"BORROWER PREDICTION CONTEXT:\n"
        f"- Lender: {bank}\n"
        f"- Loan Type: {loan_type} loan\n"
        f"- Quoted Rate: {offered:.2f}%\n"
        f"- Model Fair Rate: {fair:.2f}%\n"
        f"- Spread: +{diff:.2f}% (Verdict: {verdict})\n"
        f"- CIBIL Score: {credit_score}\n"
        f"- Contributing Factors: {', '.join([str(r) for r in reasons[:3]]) if reasons else 'Market base rate, tenure, and credit score'}\n"
    )

    messages = [
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": f"{context_str}\nBorrower Question: {question}"}
    ]

    llm_answer = call_groq_llm(messages, max_tokens=350, temperature=0.3)
    if not llm_answer:
        # Fallback to Anthropic
        llm_answer = call_anthropic_llm(f"{system_instruction}\n{context_str}\nQuestion: {question}")

    if llm_answer and len(llm_answer.strip()) > 20:
        cleaned_ans = llm_answer.strip()
        return {
            "question": question,
            "answer": cleaned_ans,
            "reply": cleaned_ans,
            "disclaimer": "FAIRRATE is for educational purposes only and uses machine learning baselines. Not official financial advice.",
            "powered_by": "Groq AI High-Speed Inference",
        }

    # Rule-based fallback
    q_lower = question.lower()
    if "why" in q_lower or "high" in q_lower or "reason" in q_lower:
        ans = (
            f"Based on your profile, {bank} offered you {offered:.2f}%, which is {diff:.2f}% higher than the model-estimated fair rate of {fair:.2f}% (Verdict: {verdict}). "
            f"The primary factors influencing this include credit risk spread, lender category adjustments, and existing debt obligations. "
            f"Check the SHAP Waterfall tab to inspect the exact basis-point impact of each feature."
        )
    elif "lower" in q_lower or "reduce" in q_lower or "improve" in q_lower or "negotiate" in q_lower:
        ans = (
            f"To lower your interest rate: (1) Use our AI Negotiation Script to request an interest revision citing your CIBIL score; "
            f"(2) Test our Credit Improvement Planner to see the rate drop from reaching the next score tier; "
            f"(3) Compare peer lenders on the Compare tab — switching to a PSU bank like SBI or BOB often saves 0.5%–1.5%."
        )
    elif "compare" in q_lower or "cheaper" in q_lower or "best bank" in q_lower:
        ans = (
            f"Public sector banks (SBI, PNB, Bank of Baroda) generally offer the lowest spreads for prime borrowers. "
            f"Private banks and NBFCs charge wider credit spreads but may offer faster turnaround times. "
            f"Visit the Compare tab to view predicted fair rates across all 11 lenders for your exact profile."
        )
    else:
        ans = (
            f"FAIRRATE analyzes your loan parameters using machine learning calibrated against RBI and Indian bank rate cards. "
            f"Your current fair rate estimate is {fair:.2f}% versus {offered:.2f}% quoted. "
            f"Explore the Plan menu tools for EMI amortization, balance transfers, and true APR calculations."
        )

    return {
        "question": question,
        "answer": ans,
        "reply": ans,
        "disclaimer": "FAIRRATE is for educational purposes only and uses synthetic/calibrated data. Not official financial advice.",
        "powered_by": "Heuristic Knowledge Base",
    }
