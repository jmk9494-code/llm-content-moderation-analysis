
# LLM Content Moderation Analysis Platform 🛡️

A comprehensive, enterprise-grade system for auditing, analyzing, and improving Large Language Model (LLM) safety policies.

**Features:**
*   **Automated Auditing**: Test models (OpenAI, Anthropic, Llama, etc.) against thousands of adversarial prompts.
*   **Live Dashboard**: Real-time visualization of refusal rates, cost per run, and model comparison.
*   **Semantic Analysis**: Uses AI embeddings to cluster refusal reasons and find bias patterns.
*   **Policy Tuning**: Automatically generates policy patches using meta-prompting.
*   **Bias Tracking**: "Time-Travel" charts to see how model safety evolves over weeks.

## 🚀 Quick Start

### Option A: Docker (Recommended)
This bypasses all local dependency issues (python, pip, node).

1.  **Configure API Keys**:
    Create a `.env` file in the root:
    ```bash
    OPENROUTER_API_KEY=sk-or-v1-...
    ADMIN_PASSWORD=secret
    ```

2.  **Run the Stack**:
    ```bash
    docker-compose up --build
    ```
    *   **Frontend**: `http://localhost:3000`
    *   **Backend**: Running in background.

### Option B: Local Setup
If you prefer running natively.

1.  **Backend (Python)**:
    ```bash
    pip install -r requirements.txt
    python src/migrate_csv_to_sql.py  # Initialize DB
    ```

2.  **Frontend (Next.js)**:
    ```bash
    cd web
    npm install
    npm run dev
    ```

## 🧠 Workflows

### 1. Running an Audit
Test a model against the dataset.
```bash
# Docker
docker-compose run analyst python src/audit_runner.py --model openai/gpt-4 --limit 50

# Local
python src/audit_runner.py --model openai/gpt-4 --limit 50
```
*   **Flags**:
    *   `--force`: Ignore the cache (Time-Aware Caching defaults to 7 days).
    *   `--limit N`: Only run N prompts (good for testing).

### 2. Semantic Analysis
Cluster refusals to understand *why* models are blocking content.
```bash
docker-compose run analyst python src/cluster_analysis.py
```
*   View results at `http://localhost:3000/analysis`.

### 3. Policy Tuning
Found a False Positive? Fix it.
```bash
# Analyze 'creative_writing' failures
python src/policy_tuner.py --category creative_writing
```
*   Generates a `policy_suggestion_YYYYMMDD.md` with a better system prompt.

## 📂 Project Structure

*   `src/`: Python source code (Auditor, Analyst, Tuner).
*   `web/`: Next.js Dashboard (React, Tailwind, Recharts).
*   `tests/`: Integration tests (`pytest`).
*   `audit.db`: SQLite database (auto-created).
*   `.github/`: CI/CD Workflows.

## 🛠️ Deployment

**Frontend (Vercel)**:
*   Project is configured with `vercel.json` for headers and caching.
*   Push to Main -> Deploys automatically if connected.

**Backend (Render/Railway)**:
*   Use `render.yaml` to deploy the worker and dashboard defined services.

## 📜 License
Internal Research Tool.
