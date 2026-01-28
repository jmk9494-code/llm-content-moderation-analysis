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

# 3. Consensus & Bias
echo "⚖️ Calculating Consensus Bias..."
# This might fail without keys, but we'll try
python3 src/analysis/consensus.py

# 4. Political Compass Chart (MOCK MODE enabled for quick viz)
echo "🧭 Generating Political Compass Chart (Mock Mode)..."
python3 src/analysis/political_compass.py --mock --output web/public/political_compass.png

# 5. Paternalism Audit Chart
echo "👶 Generating Paternalism Audit Chart..."
python3 src/analysis/plot_paternalism.py --input $AUDIT_LOG --output web/public/paternalism.png

# 6. JSON Conversion for Evidence Locker & Alignment Tax
echo "📂 Converting CSV to JSON (traces.json)..."
python3 scripts/convert_csv_to_json.py

# 7. Semantic Clusters
echo "🏷️ Generating Semantic Clusters..."
python3 src/analysis/analyst.py --input $AUDIT_LOG --output web/public/clusters.json

echo "✅ All reports generated successfully!"
echo "Check your dashboard at http://localhost:3000/analysis"
