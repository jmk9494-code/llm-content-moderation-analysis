#!/bin/bash
set -e

echo "🚀 Starting Finalization & Merge..."

# 1. Verification
# Ensure benchmark is actually done (check against expected ~200k lines)
LINE_COUNT=$(wc -l < web/public/audit_log.csv | tr -d ' ')
if [ "$LINE_COUNT" -lt 190000 ]; then
    echo "⚠️  WARNING: audit_log.csv has only $LINE_COUNT rows. Expected ~200,000."
    read -p "Are you sure you want to proceed? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborting."
        exit 1
    fi
fi

# 2. Cleanup & file swapping
echo "🧹 Cleaning up data files..."
# Backup old prompts just in case, or just delete if user said "delete all old data"
# We will overwrite prompts.csv with the full database version
mv data/prompts_full_db.csv data/prompts.csv
echo "✅ Swapped data/prompts_full_db.csv -> data/prompts.csv"

# Remove the specific backup log if it exists
if [ -f "web/public/audit_log_backup.csv" ]; then
    rm web/public/audit_log_backup.csv
    echo "🗑️  Deleted audit_log_backup.csv"
fi

# 3. Git Operations
echo "📦 Staging files for Git..."
git add web/public/audit_log.csv
git add data/prompts.csv
# Add any other modified files
git add scripts/run_full_benchmark.py
git add task.md implementation_plan.md walkthrough.md

echo "💾 Committing..."
git commit -m "feat: complete full benchmark run (20 models, 10.5k prompts)"

echo "🚀 Pushing to origin..."
git push

echo "🎉 DONE! Dashboard is now populated with ~200k audit results."
