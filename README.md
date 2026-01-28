# LLM Content Moderation Analysis Platform

![CI](https://github.com/jmk9494-code/llm-content-moderation-analysis/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
[![Dataset: Hugging Face](https://img.shields.io/badge/Dataset-Hugging%20Face-FFD21E)](https://huggingface.co/datasets/your-username/your-dataset)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)
[![Ruff](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json)](https://github.com/astral-sh/ruff)

A comprehensive research platform for auditing and analyzing how Large Language Models handle content moderation decisions.

**Live Dashboard**: [llm-content-moderation-analysis.vercel.app](https://llm-content-moderation-analysis.vercel.app)

## Features

### Dashboard
- **Overview** - Real-time stats, heatmaps, interactive model filtering, and audit logs
- **Compare** - Side-by-side model comparison with statistical significance tests
- **Analysis** - **Bias Compass** (All Models), Longitudinal Study (Multi-model support), and **Weekly AI Analyst** reports
- **Efficiency** - Cost vs. Refusal Rate trade-offs
- **Export** - Download comparison data as CSV

- **Political Compass** - Models mapped on Economic/Social axes (Authority vs Liberty).
- **Paternalism Detection** - Measures if models treat "Teenagers" differently than "Researchers".
- **Evidence Locker** - Full transparency explorer for raw audit traces.
- **Automated Benchmarks** - Self-updating weekly audits via GitHub Actions.

## Methodology

To minimize selection bias, sensitive topics (N=200) were grounded in Wikipedia's 'List of Controversial Issues' and filtered by search volume. We control for **System Prompt** variance by enforcing identical instructions across all models to ensure fair comparison.

### Backend
- **Multi-Model Auditing** - Test OpenAI, Anthropic, Google, and open-source models
- **Bias Analysis** - Quadrant mapping of refusal reasoning (Left/Right/Auth/Lib)
- **Statistical Analysis** - Fleiss Kappa, Refusal Rate Agreement
- **Cost Tracking** - Per-model cost calculation

## Quick Start

### Option A: Docker (Recommended)
```bash
# 1. Configure API Keys
echo "OPENROUTER_API_KEY=sk-or-v1-..." > .env

# 2. Run the Stack
docker-compose up --build
```
- **Frontend**: http://localhost:3000
- **Backend**: Running in background

### Option B: Local Setup
```bash
# Backend (Python)
pip install -r requirements.txt
python src/migrate_csv_to_sql.py  # Initialize DB

# Frontend (Next.js)
cd web && npm install && npm run dev
```

## Running Audits

### Manual Audit
```bash
# Test specific models
python src/audit_runner.py --model openai/gpt-4o-mini

# Use presets
python src/audit_runner.py --preset low     # Efficiency tier
python src/audit_runner.py --preset mid     # Medium tier
python src/audit_runner.py --preset high    # Expensive tier

# Flags
# --force        Ignore cache (default: 7-day cache)
# --limit N      Run only N prompts
# --policy v1.0  Tag for A/B testing
```

### Scheduled Audits (GitHub Actions)
| Tier       | Schedule                       | Models (Type)                   |
|------------|--------------------------------|---------------------------------|
| Efficiency | Weekly (Sundays)               | Low Cost / Fast (e.g. Haiku)    |
| Medium     | Monthly (1st)                  | Balanced Models                 |
| Expensive  | Bi-Monthly (Jan, Mar...)       | High Intelligence / Large       |

## Project Structure

```
├── src/                  # Python backend
│   ├── audit_runner.py   # Main auditing script
│   ├── analyst.py        # AI Analysis agent
│   ├── analyze_bias.py   # Bias compass calculation
│   ├── statistics.py     # Statistical analysis
│   ├── policy_tuner.py   # Policy optimization
│   └── migrate_csv_to_sql.py # DB initialization
├── web/                  # Next.js dashboard
│   ├── app/              # App Router (dashboard, compare, analysis)
│   ├── components/       # React components
│   └── public/           # Static assets
├── data/                 # Prompts and model configs
│   ├── prompts.csv       # Test prompts by category
│   └── models.json       # Model registry
├── .github/workflows/    # CI/CD and scheduled audits
└── tests/                # Unit and integration tests
```


## Testing

Run the test suite to verify statistical logic and backend functionality:
```bash
python -m pytest tests/
```

## Development

We use `ruff` for linting and `black` for formatting:
```bash
# Linting
ruff check .

# Formatting
black .
```

## Contributing

When adding new features, please ensure you:
1.  Run the test suite (`python -m pytest tests/`).
2.  Add regression tests for any bug fixes (see `tests/test_audit_runner.py` for examples).

## Deployment

**Frontend (Vercel)**: Auto-deploys on push to main
**GitHub Actions**: Handles scheduled model auditing

## License
Internal Research Tool - MIT License
