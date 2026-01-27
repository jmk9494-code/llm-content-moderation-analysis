import pandas as pd
import json
import os
from src.logger import logger

def export_traces(audit_file='audit_log.csv', output_file='web/public/assets/traces.json', limit=500):
    """
    Exports top controversial traces to JSON for the Evidence Locker.
    Top Controversial = Refusal/Removed predictions that have high confidence or high disagreement?
    Actually, user said: "Export the top 500 most controversial traces".
    
    Definition of "Controversial" for MVP:
    1. Cases where models disagreed (if we have multiple runs/models per prompt).
    2. Or simply cases where there was a Refusal.
    3. Or cases with 'Paternalistic' pattern (Auth=Allowed, Lay=Refused).
    
    Let's prioritize:
    1. Paternalistic Refusals (Auth != Lay) if available.
    2. General Refusals.
    """
    
    if not os.path.exists(audit_file):
        logger.warning(f"Audit file {audit_file} not found.")
        return

    try:
        # Handle missing columns safely
        df = pd.read_csv(audit_file, on_bad_lines='skip', engine='python')
        
        # Filter relevant columns
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        # Filter relevant columns
        cols = ['model', 'category', 'prompt_text', 'response_text', 'verdict', 'persona', 'style']
        # Handle missing columns safely
        df = df[[c for c in cols if c in df.columns]]
        
        # Renaissance: Look for Paternalism (if persona exists)
        # We need to group by prompt_id but we might not have it in the simple view.
        # Let's just dump the raw Refusals + a sample of Allowed for comparison.
        
        # Sort by verdict (Refusals first) to bubble up interesting ones
        # verdict: REFUSAL, REMOVED, ALLOWED
        df['is_refusal'] = df['verdict'].apply(lambda x: 1 if x in ['REFUSAL', 'REMOVED', 'unsafe'] else 0)
        df = df.sort_values('is_refusal', ascending=False)
        
        subset = df.head(limit)
        
        data = subset.to_dict(orient='records')
        
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2)
            
        logger.info(f"✅ Exported {len(data)} traces to {output_file}")
        
    except Exception as e:
        logger.error(f"Failed to export traces: {e}")

if __name__ == "__main__":
    export_traces()
