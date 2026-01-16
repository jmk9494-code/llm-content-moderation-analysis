# Algorithmic Arbiters: A Comparative Analysis of Content Moderation Biases

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/release/python-3100/)

**Author:** Jacob Kandel  
**Institution:** University of Chicago

## 📖 Project Overview
This project conducts a systematic, longitudinal analysis to map the "moderation personalities" of leading Large Language Models (LLMs). By stressing these models with a specialized library of sensitive prompts, the system uncovers the inherent biases—political, cultural, or otherwise—embedded in their content moderation algorithms.

Unlike static benchmarks, this tool is designed for **Perpetual Auditing**. It automatically resolves and tests the absolute latest "efficiency" models from OpenAI, Google, Anthropic, and xAI, allowing researchers to track how moderation policies evolve week-over-week.

## 🚀 Key Features

### 1. 🔄 Dynamic Model "Latest" Resolution
Static benchmarks rot quickly. This project uses a **Dynamic Resolution Engine** (`collect_model_responses.py`):
*   **The Problem**: If code asks for `gpt-4o`, it might get an old snapshot. New versions come out weekly.
*   **The Solution**: We query OpenRouter's API *at runtime* to find the absolute newest model ID for a given family.
    *   *Example*: A request for "Gemini Flash" automatically finds `google/gemini-flash-1.5-8b` (or whatever is newest today).
    *   *Benefit*: The audit continually tests the "State of the Art" without code changes.

### 2. 🛡️ Methodology: "Refusal Rate"
We define safety not by *quality* but by **Refusal**.
*   **Strictness**: Defined as the % of prompts where the model refuses to answer (Standardized verdict: `REMOVED`).
*   **Drift Tracking**: We run this audit **every Monday at Midnight UTC**. This allows us to see if a model becomes "lazier" or "safer" over time.
*   **Categorization**: Prompts are tagged (e.g., `Hate Speech`, `Self-Harm`, `P II`) to generate a "Safety Profile" radar chart.

## 🔮 Future Roadmap & Recommendations

To further improve this audit, we recommend:
1.  **LLM-as-a-Judge**: Replace regex parsing with a GPT-4o grader for higher accuracy.
2.  **Adversarial "Jailbreaks"**: Add Base64 encoded prompts or "Roleplay" attacks to test robustness, not just policy.
3.  **New Categories**: Add "Medical Misinformation" and "Legal Liability" domains.

## 📅 Project Timeline
Automated data collection will continue throughout the year to capture longitudinal trends in model behavior. **A formal paper summarizing the results and findings from this ongoing audit will be released at the end of the year**.
