import pandas as pd
import os
import argparse
from sklearn.metrics import cohen_kappa_score
import random

# Use the standardized path
AUDIT_LOG_PATH = "web/public/audit_log.csv"
OUTPUT_PATH = "data/human_audit_PENDING.csv"

def generate_sample(n=50):
    """Generates a balanced random sample for human review."""
    if not os.path.exists(AUDIT_LOG_PATH):
        print(f"❌ Error: Audit log not found at {AUDIT_LOG_PATH}")
        return

    try:
        df = pd.read_csv(AUDIT_LOG_PATH, on_bad_lines='skip', engine='python')
        
        # Filter for relevant columns
        if 'verdict' not in df.columns:
             print("❌ Error: 'verdict' column missing in audit log.")
             return

        # Create balanced sample (Refusals vs Allowed)
        refusals = df[df['verdict'].isin(['REFUSAL', 'REMOVED', 'unsafe', 'Hard Refusal'])]
        allowed = df[~df['verdict'].isin(['REFUSAL', 'REMOVED', 'unsafe', 'Hard Refusal'])]
        
        n_half = n // 2
        
        if len(refusals) < n_half or len(allowed) < n_half:
            print(f"⚠️ Warning: Not enough data for balanced split. Refusals: {len(refusals)}, Allowed: {len(allowed)}")
            sample = df.sample(min(n, len(df)))
        else:
            sample_r = refusals.sample(n_half)
            sample_a = allowed.sample(n - n_half)
            sample = pd.concat([sample_r, sample_a]).sample(frac=1) # Shuffle

        # Prepare for Human Review
        # We assume 'classification' or 'verdict' is the AI label
        sample['AI_Label'] = sample['verdict'].apply(lambda x: 1 if x in ['REFUSAL', 'REMOVED', 'unsafe', 'Hard Refusal'] else 0)
        sample['Human_Label_EMPTY'] = "" # Placeholder for user
        
        export_cols = ['model', 'prompt_text', 'response_text', 'AI_Label', 'Human_Label_EMPTY']
        
        # Handle column naming variations
        if 'prompt_text' not in sample.columns:
            if 'text' in sample.columns: sample = sample.rename(columns={'text': 'prompt_text'})
            elif 'prompt' in sample.columns: sample = sample.rename(columns={'prompt': 'prompt_text'})
            
        if 'response_text' not in sample.columns:
             if 'response' in sample.columns: sample = sample.rename(columns={'response': 'response_text'})

        sample[export_cols].to_csv(OUTPUT_PATH, index=False)
        print(f"✅ Generated {len(sample)} samples to {OUTPUT_PATH}")
        print("👉 ACTION REQUIRED: Open this CSV, fill 'Human_Label_EMPTY' with 0 (Safe) or 1 (Refusal), then run this script again.")
        
    except Exception as e:
        print(f"❌ Failed to generate sample: {e}")

def calculate_agreement():
    """Calculates Cohen's Kappa between AI_Label and Human_Label."""
    if not os.path.exists(OUTPUT_PATH):
        print(f"ℹ️ File {OUTPUT_PATH} not found. Running generation mode...")
        generate_sample()
        return

    try:
        df = pd.read_csv(OUTPUT_PATH)
        
        # Check if filled
        if df['Human_Label_EMPTY'].isnull().all():
             print(f"ℹ️ 'Human_Label_EMPTY' is entirely empty in {OUTPUT_PATH}.")
             print("👉 Please fill it (0=Safe, 1=Refusal) to calculate Kappa.")
             return
             
        # Filter out unfilled rows just in case
        valid = df.dropna(subset=['Human_Label_EMPTY'])
        if len(valid) < len(df):
            print(f"⚠️ Warning: Only {len(valid)}/{len(df)} rows labeled. Calculating on subset.")
        
        if valid.empty:
            print("❌ No valid labels found.")
            return

        y_ai = valid['AI_Label'].astype(int)
        y_human = valid['Human_Label_EMPTY'].astype(int)
        
        kappa = cohen_kappa_score(y_ai, y_human)
        
        print("\n" + "="*40)
        print(f"🧪 INTER-RATER RELIABILITY RESULTS")
        print("="*40)
        print(f"Samples: {len(valid)}")
        print(f"Cohen's Kappa: {kappa:.4f}")
        
        if kappa > 0.8: rating = "Almost Perfect Agreement 🟢"
        elif kappa > 0.6: rating = "Substantial Agreement 🟡"
        elif kappa > 0.4: rating = "Moderate Agreement 🟠"
        else: rating = "Poor Agreement 🔴"
        
        print(f"Rating: {rating}")
        print("="*40 + "\n")
        
    except Exception as e:
        print(f"❌ Validation failed: {e}")

if __name__ == "__main__":
    calculate_agreement()
