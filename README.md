# Algorithmic Arbiters: A Comparative Analysis of Content Moderation Biases

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/release/python-3100/)

**Author:** Jacob Kandel  
**Institution:** University of Chicago

## 📖 Project Overview
This project conducts a systematic, longitudinal analysis to map the "moderation personalities" of leading Large Language Models (LLMs). By stressing these models with a specialized library of sensitive prompts, the system uncovers the inherent biases—political, cultural, or otherwise—embedded in their content moderation algorithms.

Unlike static benchmarks, this tool is designed for **Perpetual Auditing**. It automatically resolves and tests the absolute latest "efficiency" models from OpenAI, Google, Anthropic, and xAI, allowing researchers to track how moderation policies evolve week-over-week.

## 🚀 Key Features

### 🔄 Dynamic Model Resolution
The system does not rely on hardcoded model IDs. At runtime, it queries the OpenRouter API to identify the newest released models in specific families:
*   **OpenAI**: Finds the latest `gpt-*-mini`
*   **Google**: Finds the latest `gemini-*-flash`
*   **Anthropic**: Finds the latest `claude-*-haiku`
*   **xAI**: Finds the latest `grok-*`

This ensures the audit always reflects the current state of the art (e.g., automatically upgrading from `gemini-1.5` to `gemini-2.0` or `gemini-3.0` as soon as they are released).

### ⚡ High-Performance Async Engine
*   **Parallel Execution**: Processes 10+ prompts concurrently using Python's `asyncio`.
*   **Robustness**: Features automatic retries (`tenacity`) and adaptive JSON parsing to handle API instability and varying output formats.
*   **Real-Time Cost Tracking**: Dynamically updates pricing based on OpenRouter metadata to calculate the exact cost of each audit run.

## 🛠️ Usage

### Setup
1.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
2.  Set your API Key in `.env`:
    ```
    OPENROUTER_API_KEY=sk-or-...
    ```

### Running an Audit
To run the standard "Efficiency Suite" audit using the **latest** available models:

```bash
python collect_model_responses.py --preset efficiency --resolve-latest
```

This command will:
1.  Fetch the list of all models from OpenRouter.
2.  Resolve the newest version for each provider (GPT, Gemini, Claude, Grok).
3.  Audit them against the prompt library (`data/prompts.csv`).
4.  Save results to `audit_log.csv`.

### Interactive Dashboard
Visualize the results, including model refusal rates and longitudinal drift:
```bash
streamlit run app.py
```

## 📂 Project Components
*   **`collect_model_responses.py`**: The core auditing engine. Handles API communication, dynamic resolution, and data collection.
*   **`data/prompts.csv`**: A curated library of **96 prompts** categorized into Hate Speech, Misinformation, Incitement to Violence, and simple Tests.
*   **`app.py` / `src/dashboard.py`**: A Streamlit frontend for exploring the data.

## 📅 Project Timeline
Automated data collection will continue throughout the year to capture longitudinal trends in model behavior. **A formal paper summarizing the results and findings from this ongoing audit will be released at the end of the year**.
