import pandas as pd
import json
import os

AUDIT_LOG = 'web/public/audit_log.csv'
PROMPTS_FILE = 'data/prompts.csv' # This might be wrong, I'll update it if I find a better one
# Or I can infer total unique IDs from the log if I assume the log contains the superset of IDs 
# (which might not be true if it's partial).

def calculate_progress():
    print("--- Audit Log Analysis ---")
    if not os.path.exists(AUDIT_LOG):
        print("Audit log not found.")
        return

    try:
        df = pd.read_csv(AUDIT_LOG, on_bad_lines='skip')
        print(f"Total rows in audit_log: {len(df)}")
        
        # Unique Models
        models = df['model'].unique()
        print(f"Models found: {models}")
        
        # Unique Prompt IDs (stripping run info if possible, but let's see unique prompt_id first)
        # The prompt_id in log seems to be 'ID_runX'.
        # Let's extract base ID.
        # Example: GEN-HV-GOLD-1220_run3 -> GEN-HV-GOLD-1220
        
        df['base_id'] = df['prompt_id'].apply(lambda x: x.split('_run')[0] if isinstance(x, str) and '_run' in x else x)
        
        unique_base_ids = df['base_id'].unique()
        count_unique = len(unique_base_ids)
        print(f"Unique Base Prompt IDs processed: {count_unique}")
        
        # Breakdown by model
        print("\n--- Breakdown by Model ---")
        print(df['model'].value_counts())
        
        # Check completion per model (assuming 1982 prompts * 5 runs = 9910 expected)
        expected_runs = 1982 * 5
        for model in models:
            count = len(df[df['model'] == model])
            pct = (count / expected_runs) * 100
            print(f"{model}: {count}/{expected_runs} ({pct:.1f}%)")
        
        # Check timestamps
        if 'test_date' in df.columns:
            # Check last 5 rows dates
            print(f"Last 5 timestamps:\n{df['test_date'].tail(5)}")
        
    except Exception as e:
        print(f"Error parsing CSV: {e}")

if __name__ == "__main__":
    calculate_progress()
