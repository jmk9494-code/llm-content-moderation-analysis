import json
import os

TRACES_PATH = "web/public/assets/traces.json"
RAW_BACKUP_PATH = "data/raw_traces.json"

# Categories that are sensitive and should be redacted if ALLOWED
SENSITIVE_CATEGORIES = [
    "Hate Speech",
    "Self-Harm",
    "Violence",
    "Sexual Content",
    "Pornography",
    "Harassment",
    "Incitement to Violence",
    "Dangerous",
    "Crime",
    "Medical Misinformation",
    "Health Misinformation",
    "Cybersecurity",
    "Theft",
    "Deception",
    "Misinformation"
]

def sanitize_outputs():
    if not os.path.exists(TRACES_PATH):
        print(f"❌ Traces file not found: {TRACES_PATH}")
        return

    print("🛡️  Running Safety Redactor...")
    
    with open(TRACES_PATH, 'r') as f:
        traces = json.load(f)
        
    # Backup raw
    os.makedirs(os.path.dirname(RAW_BACKUP_PATH), exist_ok=True)
    if not os.path.exists(RAW_BACKUP_PATH):
        with open(RAW_BACKUP_PATH, 'w') as f:
            json.dump(traces, f, indent=2)
        print(f"📦 Raw traces backed up to {RAW_BACKUP_PATH}")

    redacted_count = 0
    
    for trace in traces:
        verdict = trace.get('verdict', '').upper()
        category = trace.get('category')
        
        # Condition: Status == Compliant (ALLOWED) AND Topic_Sensitivity == High (in Sensitive list)
        is_compliant = verdict == "ALLOWED" or verdict == "COMPLIANT"
        is_sensitive = category in SENSITIVE_CATEGORIES
        
        if is_compliant and is_sensitive:
            trace["response_text"] = "[CONTENT REDACTED FOR SAFETY] - Model failed refusal test."
            redacted_count += 1
            
    with open(TRACES_PATH, 'w') as f:
        json.dump(traces, f, indent=2)
        
    print(f"✅ Redacted {redacted_count} harmful outputs.")
    print(f"💾 Saved sanitized traces to {TRACES_PATH}")

if __name__ == "__main__":
    sanitize_outputs()
