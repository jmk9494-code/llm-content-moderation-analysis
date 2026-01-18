import pandas as pd
import os

AUDIT_LOG_PATH = 'web/public/audit_log.csv'
STRATEGY_LOG_PATH = 'web/public/strategy_log.csv'

def clean_audit_log():
    if not os.path.exists(AUDIT_LOG_PATH):
        print(f"No audit log found at {AUDIT_LOG_PATH}")
        return

    print(f"Cleaning {AUDIT_LOG_PATH}...")
    df = pd.read_csv(AUDIT_LOG_PATH)
    original_count = len(df)

    # Logic: Group by (test_date, model) and count prompts
    # We want to remove runs that didn't finish.
    # Assuming a 'full' run has the max number of prompts for that day/model combo.
    # Actually, a simpler heuristic: if a run has < 50% of the max prompts seen for any run, drop it.
    # Or, let's just drop runs with very few prompts (e.g. < 5) which indicate a crash start.
    # For now, let's look for the mode or max count.
    
    # Let's count prompts per (date, model)
    counts = df.groupby(['test_date', 'model']).size().reset_index(name='count')
    max_prompts = counts['count'].max()
    print(f"Max prompts in a single run: {max_prompts}")
    
    # Filter out runs that are significantly incomplete (e.g., < 90% of max, or just broken ones)
    # If the user wants "all" missing fields removed, we should also check for NaNs.
    
    # 1. Drop rows with critical missing data
    df = df.dropna(subset=['verdict', 'prompt_text'])
    
    # 2. Filter partial runs
    # We'll keep runs that have at least (max_prompts - 5) to account for minor hiccups, 
    # but likely they should all be identical.
    # Let's be strict: calculate usage per group and keep only those > threshold
    threshold = max_prompts * 0.9
    valid_groups = counts[counts['count'] >= threshold]
    
    # Merge back to keep only valid rows
    clean_df = df.merge(valid_groups[['test_date', 'model']], on=['test_date', 'model'], how='inner')
    
    clean_df.to_csv(AUDIT_LOG_PATH, index=False)
    print(f"Removed {original_count - len(clean_df)} rows. New count: {len(clean_df)}")

def clean_strategy_log():
    # Strategy Log update: formatting changed to include response_text.
    # Old rows are missing this. User wants to remove result from older runs that don't have all prompts or are missing fields.
    # Simpler approach: Wipe it and start fresh with the new header, 
    # OR drop rows where response_text is NaN.
    
    if not os.path.exists(STRATEGY_LOG_PATH):
        return

    print(f"Cleaning {STRATEGY_LOG_PATH}...")
    df = pd.read_csv(STRATEGY_LOG_PATH)
    original_count = len(df)
    
    # If 'response_text' column doesn't exist, the whole file is old. Wipe it.
    if 'response_text' not in df.columns:
        print("Old format detected (no response_text). Wiping file.")
        # Write header only
        empty_df = pd.DataFrame(columns=['test_date', 'model', 'prompt_id', 'category', 'type', 'verdict', 'response_text', 'run_cost'])
        empty_df.to_csv(STRATEGY_LOG_PATH, index=False)
        return

    # If it exists, drop rows where it is NaN
    df = df.dropna(subset=['response_text'])
    
    clean_df = df
    clean_df.to_csv(STRATEGY_LOG_PATH, index=False)
    print(f"Removed {original_count - len(clean_df)} rows (missing response_text). New count: {len(clean_df)}")

if __name__ == "__main__":
    clean_audit_log()
    clean_strategy_log()
