# LLM Content Moderation Analysis Platform 🛡️

A comprehensive research platform for auditing and analyzing how Large Language Models handle content moderation decisions.

**Live Dashboard**: [llm-content-moderation-analysis.vercel.app](https://llm-content-moderation-analysis.vercel.app)

## ✨ Features

### Dashboard
- **Overview** - Real-time stats, heatmaps, model comparison, and audit logs
- **Compare** - Side-by-side model comparison with radar charts
- **Deep Dive** - Statistical analysis, semantic clustering, **Bias Compass**, and **Model Registry**
- **Efficiency** - Cost vs. Safety trade-offs

### Backend
- **Multi-Model Auditing** - Test OpenAI, Anthropic, Google, and open-source models
- **Bias Analysis** - Quadrant mapping of refusal reasoning (Left/Right/Auth/Lib)
- **Statistical Analysis** - Fleiss Kappa, Agreement Distribution
- **Cost Tracking** - Per-model cost calculation

## 🚀 Quick Start

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

## 📊 Running Audits

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
| Schedule              | Models                          |
|----------------------|--------------------------------|
| Weekly (Sundays)     | GPT-4o-mini, Claude Haiku, etc |
| Monthly (1st)        | Gemini Flash, Large Models     |

## 📂 Project Structure

```
├── src/                  # Python backend
│   ├── audit_runner.py   # Main auditing script
│   ├── statistics.py     # Statistical analysis
│   └── cluster_analysis.py
├── web/                  # Next.js dashboard
│   ├── app/              # Pages (dashboard, compare, analysis)
│   └── components/       # React components
├── data/                 # Prompts and model configs
│   ├── prompts.csv       # Test prompts by category
│   └── models.json       # Model registry
├── .github/workflows/    # CI/CD and scheduled audits
└── tests/                # Integration tests
```

## 🛠️ Deployment

**Frontend (Vercel)**: Auto-deploys on push to main
**GitHub Actions**: Handles scheduled model auditing

## 📜 License
Internal Research Tool - MIT License
