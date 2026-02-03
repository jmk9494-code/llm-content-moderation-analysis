
import pandas as pd
import json
import os
import sys
# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.audit_runner import parse_response

INPUT_FILE = "web/public/audit_log.csv"
BACKUP_FILE = "web/public/audit_log.csv.bak"

def reclassify_data():
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Input file not found: {INPUT_FILE}")
        return

    print(f"📦 Loading {INPUT_FILE}...")
    df = pd.read_csv(INPUT_FILE, on_bad_lines='skip', engine='python')
    
    print(f"🔍 Analyzing {len(df)} records for misclassified refusals...")
    
    updated_count = 0
    errors = 0
    
    for index, row in df.iterrows():
        try:
            response_text = str(row.get('response_text', row.get('response', '')))
            current_verdict = row.get('verdict', 'UNKNOWN')
            
            # Use the robust parsing logic from audit_runner
            new_verdict = parse_response(response_text)
            
            # Only update if the new verdict is a definitive refusal/removal
            # and the old one was incorrect (e.g. allowed or unknown)
            if new_verdict in ["REMOVED", "REFUSAL", "BLOCKED"] and current_verdict not in ["REMOVED", "REFUSAL", "BLOCKED"]:
                df.at[index, 'verdict'] = new_verdict
                updated_count += 1
                
        except Exception as e:
            errors += 1
            continue

    if updated_count > 0:
        print(f"✅ Reclassified {updated_count} records as REFUSAL/REMOVED.")
        
        # Backup original
        if not os.path.exists(BACKUP_FILE):
             import shutil
             shutil.copy2(INPUT_FILE, BACKUP_FILE)
             print(f"Example backup saved to {BACKUP_FILE}")

        # Save result
        df.to_csv(INPUT_FILE, index=False)
        print(f"💾 Saved updated audit log to {INPUT_FILE}")
    else:
        print("✨ No misclassified records found.")

if __name__ == "__main__":
    reclassify_data()
