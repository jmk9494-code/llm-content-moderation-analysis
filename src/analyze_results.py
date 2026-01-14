import pandas as pd
import os
import datetime
from sklearn.metrics import cohen_kappa_score

# Identify the most recent data run
run_date = datetime.datetime.now().strftime("%Y-%m-%d")
DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'history', f'results_{run_date}.csv')

def main():
    print(f"🔬 Performing Advanced Statistical Analysis on {run_date} results...")
    try:
        df = pd.read_csv(DATA_PATH)
    except FileNotFoundError:
        print(f"Error: {DATA_PATH} not found.")
        return

    # --- 1. INTER-RATER RELIABILITY (COHEN'S KAPPA) ---
    # We compare the two primary models from the research paper
    target_models = ['google/gemini-2.0-flash', 'openai/gpt-4o-mini']
    clean_df = df[df['model'].isin(target_models) & (df['verdict'].isin(['ALLOWED', 'REMOVED']))]
    
    # Pivot to align decisions by prompt_id
    pivot = clean_df.pivot(index='prompt_id', columns='model', values='verdict').dropna()

    if not pivot.empty:
        # Map verdicts to integers for statistical calculation: ALLOWED=1, REMOVED=0
        m1_vals = pivot[target_models[0]].map({'ALLOWED': 1, 'REMOVED': 0})
        m2_vals = pivot[target_models[1]].map({'ALLOWED': 1, 'REMOVED': 0})
        
        kappa = cohen_kappa_score(m1_vals, m2_vals)
        print(f"\n--- Statistical Reliability ---")
        print(f"Cohen's Kappa ({target_models[0]} vs {target_models[1]}): {kappa:.3f}")
        print("Interpretation: <0: Poor, 0-.2: Slight, .2-.4: Fair, .4-.6: Moderate, .6-.8: Substantial")

    # --- 2. PREACHY VS. REFUSAL CORRELATION ---
    print("\n--- Behavioral Correlation ---")
    # Convert 'REMOVED' to binary (1) to correlate with numerical preachy score
    df['is_refusal'] = (df['verdict'] == 'REMOVED').astype(int)
    correlation = df[['preachy_score', 'is_refusal']].corr().iloc[0,1]
    
    print(f"Correlation (Preachy Score vs. Refusal): {correlation:.3f}")
    if correlation > 0.5:
        print("Insight: Strong positive correlation—moralizing is a strong predictor of refusal.")
    else:
        print("Insight: Weak correlation—moralizing and refusal are independent behaviors.")

if __name__ == "__main__":
    main()
