import pandas as pd
import json
import os

def convert_csv_to_json():
    csv_path = 'web/public/audit_log.csv'
    json_path = 'web/public/assets/traces.json'
    
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found.")
        return

    print(f"Reading {csv_path}...")
    try:
        # standardizing columns for frontend
        df = pd.read_csv(csv_path, on_bad_lines='skip', engine='python')
        
        # Rename columns if needed to match frontend expectation: 
        # model, category, persona, prompt_text (or prompt), response_text (or response), verdict
        # Frontend expects: model, category, persona, prompt_text, response_text, verdict
        
        # Check if 'prompt' exists, map to 'prompt_text'
        if 'prompt' in df.columns and 'prompt_text' not in df.columns:
            df['prompt_text'] = df['prompt']
            
        if 'response' in df.columns and 'response_text' not in df.columns:
            df['response_text'] = df['response']
            
        if 'run_cost' in df.columns:
            df['cost'] = df['run_cost']
        if 'total_tokens' in df.columns:
            df['tokens_used'] = df['total_tokens']
        if 'test_date' in df.columns:
            df['timestamp'] = df['test_date']

        # Select dependencies
        cols = ['model', 'category', 'persona', 'prompt_text', 'response_text', 'verdict', 'cost', 'tokens_used', 'timestamp']
        # Filter only existing cols
        existing_cols = [c for c in cols if c in df.columns]
        
        subset = df[existing_cols].fillna('')
        
        # Write to JSON
        os.makedirs(os.path.dirname(json_path), exist_ok=True)
        
        # Use records orientation for list of objects
        subset.to_json(json_path, orient='records')
        print(f"✅ Successfully converted to {json_path}")
        
    except Exception as e:
        print(f"Failed to convert: {e}")

if __name__ == "__main__":
    convert_csv_to_json()
