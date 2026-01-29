#!/bin/bash

# Usage: ./scripts/finalize_run.sh <PID>
PID=$1

if [ -z "$PID" ]; then
    echo "Usage: $0 <PID>"
    exit 1
fi

echo "🔄 Monitoring PID $PID..."
echo "✅ This script will automatically commit and push to GitHub when the process finishes."

# Wait loop
while ps -p $PID > /dev/null; do
    sleep 60
done

echo "🚀 Process $PID finished. Starting commit..."

# 1. Add all changes (code fixes + new data)
git add .

# 2. Commit
git commit -m "Results: Complete benchmark run (Jan 28)"

# 3. Push
echo "⬆️ Pushing to GitHub..."
git push

echo "✅ Done! All results are safe on GitHub."
