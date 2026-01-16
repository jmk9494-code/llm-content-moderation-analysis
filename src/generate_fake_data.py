import pandas as pd
import random
import os
from datetime import datetime, timedelta

def generate_fake_data():
    """Generates fake audit logs and trends for testing the dashboard."""
    print("🧪 Generating fake sample data...")
    
    models = [
        "openai/gpt-5.1-codex-mini", 
        "google/gemini-3-flash-preview", 
        "anthropic/claude-haiku-4.5", 
        "x-ai/grok-4.1-fast"
    ]
    categories = ["Hate Speech", "Misinformation", "Violence", "Sexual Content"]
    verdicts = ["ALLOWED", "REMOVED"]
    
    # 1. Generate Audit Log (Latest Run)
    audit_rows = []
    base_date = datetime.now()
    
    for i in range(100):
        m = random.choice(models)
        cat = random.choice(categories)
        # Make some models stricter
        if "gpt" in m or "claude" in m:
            v = "REMOVED" if random.random() < 0.3 else "ALLOWED"
        else:
            v = "REMOVED" if random.random() < 0.1 else "ALLOWED"
            
        audit_rows.append({
            "test_date": base_date.strftime("%Y-%m-%d"),
            "model": m,
            "prompt_id": f"P-{i:03d}",
            "category": cat,
            "verdict": v,
            "response_text": "Lorem ipsum sample response...",
            "prompt_tokens": random.randint(50, 200),
            "completion_tokens": random.randint(10, 100),
            "total_tokens": random.randint(60, 300),
            "run_cost": random.uniform(0.000001, 0.00005)
        })
    
    df_audit = pd.DataFrame(audit_rows)
    df_audit.to_csv("audit_log.csv", index=False)
    print(f"✅ Generated {len(df_audit)} rows in audit_log.csv")

    # 2. Generate Longitudinal Trends (Last 4 weeks)
    trend_rows = []
    dates = [base_date - timedelta(weeks=w) for w in range(3, -1, -1)]
    
    for d in dates:
        d_str = d.strftime("%Y-%m-%d")
        for m in models:
            # Simulate drift (e.g., getting stricter over time)
            base_allow = 90 if "grok" in m else 70
            start_drift = random.randint(-5, 5)
            
            trend_rows.append({
                "test_date": d_str,
                "model": m,
                "total_prompts": 96,
                "pct_allowed": max(0, min(100, base_allow + start_drift)),
                "pct_removed": max(0, min(100, 100 - (base_allow + start_drift))),
                "avg_cost": random.uniform(0.00001, 0.00003)
            })
            
    df_trends = pd.DataFrame(trend_rows)
    df_trends.to_csv("data/trends.csv", index=False)
    print(f"✅ Generated {len(df_trends)} rows in data/trends.csv")

if __name__ == "__main__":
    generate_fake_data()
