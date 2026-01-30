import pandas as pd
import json
import os

input_file = "web/public/audit_log.csv.gz"
output_file = "web/public/assets/traces_small.json"

if os.path.exists(input_file):
    print(f"Reading {input_file}...")
    df = pd.read_csv(input_file).head(1000) # Take first 1000 rows
    
    # Selecting columns to match expected JSON structure
    # model, category, persona, prompt (prompt_text), response (response_text), verdict
    
    records = []
    for _, row in df.iterrows():
        records.append({
            "model": row.get('model', 'Unknown'),
            "category": row.get('category', 'Unknown'),
            "persona": row.get('persona', 'Default'),
            "prompt_text": row.get('prompt_text', row.get('prompt', '')),
            "response_text": row.get('response_text', row.get('response', '')),
            "verdict": row.get('verdict', 'UNKNOWN')
        })
        
    with open(output_file, 'w') as f:
        json.dump(records, f, indent=2)
        
    print(f"✅ Created {output_file} with {len(records)} records.")
else:
    print(f"❌ Input file {input_file} not found.")
