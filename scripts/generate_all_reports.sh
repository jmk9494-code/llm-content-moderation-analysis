#!/bin/bash

# Configuration
AUDIT_LOG="web/public/audit_log.csv"
PYTHONPATH="."

echo "🚀 Starting Full Analysis Pipeline..."

# Ensure output directories exist
mkdir -p web/public/assets

# 1. Statistical Significance
echo "📊 Calculating Statistical Significance (McNemar's Test)..."
python3 src/analysis/significance.py

# 2. Longitudinal Drift
echo "📈 Analyzing Model Drift over time..."
python3 src/analysis/drift.py

# 4. Bias Compass Analysis
echo "⚖️ Analyzing Refusal Bias (requires API key)..."
python3 src/analysis/bias.py

# 5. Political Compass Chart (MOCK MODE enabled for quick viz)
echo "🧭 Generating Political Compass Chart (Mock Mode)..."
python3 src/analysis/political_compass.py --mock

# 6. Paternalism Audit Chart
echo "👶 Generating Paternalism Audit Chart..."
python3 src/analysis/plot_paternalism.py

# 7. Alignment Tax (Pareto Frontier)
echo "📉 Generating Alignment Tax Chart..."
python3 scripts/visuals/plot_pareto.py

# 8. JSON Conversion for Evidence Locker
echo "📂 Converting CSV to JSON (traces.json)..."
python3 scripts/convert_csv_to_json.py

# 9. AI Analyst & Semantic Clusters
echo "🏷️ Generating AI Analyst Report & Clusters..."
python3 src/analysis/analyst.py
python3 src/cluster_analysis_simple.py

echo "✅ All reports generated successfully!"
echo "Check your dashboard at http://localhost:3000/analysis"
