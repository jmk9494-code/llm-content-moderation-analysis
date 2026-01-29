#!/bin/bash

# Configuration
AUDIT_LOG="web/public/audit_log.csv.gz"
export PYTHONPATH="."
PYTHON_CMD="./.venv/bin/python"

echo "🚀 Starting Full Analysis Pipeline..."

# Ensure output directories exist
mkdir -p web/public/assets

# 1. Statistical Significance
echo "📊 Calculating Statistical Significance (McNemar's Test)..."
$PYTHON_CMD src/analysis/significance.py

# 2. Longitudinal Drift
echo "📈 Analyzing Model Drift over time..."
$PYTHON_CMD src/analysis/drift.py

# 4. Bias Compass Analysis
echo "⚖️ Analyzing Refusal Bias (requires API key)..."
$PYTHON_CMD src/analysis/bias.py

# 5. Political Compass Chart (MOCK MODE enabled for quick viz)
echo "🧭 Generating Political Compass Chart (Mock Mode)..."
$PYTHON_CMD src/analysis/political_compass.py --mock

# 6. Paternalism Audit Chart
echo "👶 Generating Paternalism Audit Chart..."
$PYTHON_CMD src/analysis/plot_paternalism.py

# 7. Alignment Tax (Pareto Frontier)
echo "📉 Generating Alignment Tax Chart..."
$PYTHON_CMD scripts/visuals/plot_pareto.py

# 8. JSON Conversion (SKIPPED - favoring Gzip CSV)
# echo "📂 Converting CSV to JSON (traces.json)..."
# $PYTHON_CMD scripts/convert_csv_to_json.py

# 9. AI Analyst & Semantic Clusters
echo "🏷️ Generating AI Analyst Report & Clusters..."
$PYTHON_CMD src/analysis/analyst.py
$PYTHON_CMD src/cluster_analysis_simple.py

echo "✅ All reports generated successfully!"
echo "Check your dashboard at http://localhost:3000/analysis"
