#!/bin/bash
# scripts/finalize_release.sh

echo "🚀 Finalizing Release..."

# 1. Generate Weekly Report (in case it wasn't triggered)
echo "📊 Generating Analysis Report..."
PYTHONPATH=. .venv/bin/python src/analysis/analyst.py

# 2. Git Merge
echo "📦 Committing to GitHub..."
git add .
git commit -m "Feature: Prompt Quality Audit - Standardized prompts & Augmented dataset. Reset benchmarks."
git push origin main

echo "✅ Done! Project is synced."
