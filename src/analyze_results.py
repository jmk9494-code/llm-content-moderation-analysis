import pandas as pd
import os
import datetime

# --- 1. CONFIGURATION ---
# Points to the most recent run in the history folder
run_date = datetime.datetime.now().strftime("%Y-%m-%d")
DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'history', f'results_{run_date}.csv')

def main():
    print(f"Analyzing automated results from {DATA_PATH}...")
    try:
        df = pd.read_csv(DATA_PATH)
    except FileNotFoundError:
        print(f"Error: {DATA_PATH} not found. Ensure the collection script ran successfully.")
        return

    # --- 1. REFUSAL RATES ---
    print("\n--- Summary Statistics by Model ---")
    # 'REMOVED' acts as the primary indicator for a safety refusal
    summary = df.groupby('model').agg(
        Total_Tests=('prompt_id', 'count'),
        Removal_Rate=('verdict', lambda x: (x == 'REMOVED').mean() * 100),
        Avg_Preachy_Score=('preachy_score', 'mean')
    )
    print(summary)

    # --- 2. DISAGREEMENT MATRIX (Gemini vs GPT-4o) ---
    # Compare the two target models mentioned in the research paper
    target_models = ['google/gemini-2.5-flash', 'openai/gpt-4o-mini']
    clean_df = df[df['model'].isin(target_models) & (df['verdict'].isin(['ALLOWED', 'REMOVED']))]
    
    # Pivot to align prompts side-by-side
    pivot = clean_df.pivot(index='prompt_id', columns='model', values='verdict').dropna()
    
    if not pivot.empty:
        disagreements = pivot[pivot[target_models[0]] != pivot[target_models[1]]]
        disagreement_rate = (len(disagreements) / len(pivot)) * 100
        
        print(f"\n--- Disagreement Analysis ({target_models[0]} vs {target_models[1]}) ---")
        print(f"Shared Valid Prompts: {len(pivot)}")
        print(f"Disagreements: {len(disagreements)}")
        print(f"Disagreement Rate: {disagreement_rate:.2f}%")
        
        # Save disagreements for manual evaluation
        os.makedirs("data/analysis", exist_ok=True)
        disagreements.to_csv('data/analysis/disagreements_latest.csv')
        print("Detailed disagreement list saved to data/analysis/disagreements_latest.csv")

if __name__ == "__main__":
    main()
