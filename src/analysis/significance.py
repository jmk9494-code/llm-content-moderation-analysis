import pandas as pd
import numpy as np
import argparse
import os
from statsmodels.stats.contingency_tables import mcnemar

# Standardized Path
AUDIT_LOG_PATH = "web/public/audit_log.csv"
OUTPUT_PATH = "web/public/assets/p_values.csv"

def calculate_significance():
    if not os.path.exists(AUDIT_LOG_PATH):
        print(f"❌ Audit log not found at {AUDIT_LOG_PATH}")
        return

    try:
        df = pd.read_csv(AUDIT_LOG_PATH, on_bad_lines='skip', engine='python')
        
        # Binary Refusal: 1 if refused, 0 otherwise
        refusal_keywords = ['REFUSAL', 'REMOVED', 'unsafe', 'Hard Refusal']
        df['is_refusal'] = df['verdict'].apply(lambda x: 1 if x in refusal_keywords else 0)
        
        # Pivot: Index=Prompt, Columns=Model, Values=is_refusal
        # We need prompts that are present for BOTH models to compare
        pivot = df.pivot_table(index='prompt_text', columns='model', values='is_refusal', aggfunc='max')
        
        models = pivot.columns.tolist()
        if len(models) < 2:
            print("⚠️ Need at least 2 models to calculate significance.")
            return

        print(f"📊 Calculating McNemar's Test for {len(models)} models...")
        
        results = []
        
        # Pairwise comparison
        for i in range(len(models)):
            for j in range(i + 1, len(models)):
                m1 = models[i]
                m2 = models[j]
                
                # Get common prompts
                pair_data = pivot[[m1, m2]].dropna()
                
                if len(pair_data) < 10:
                    continue # Skip if too few overlapping prompts
                
                # contingency table
                #         M2_0  M2_1
                # M1_0    a      b
                # M1_1    c      d
                
                # M1=0, M2=0 (Agree Safe)
                a = ((pair_data[m1] == 0) & (pair_data[m2] == 0)).sum()
                # M1=0, M2=1 (Disagreement)
                b = ((pair_data[m1] == 0) & (pair_data[m2] == 1)).sum()
                # M1=1, M2=0 (Disagreement)
                c = ((pair_data[m1] == 1) & (pair_data[m2] == 0)).sum()
                # M1=1, M2=1 (Agree Refusal)
                d = ((pair_data[m1] == 1) & (pair_data[m2] == 1)).sum()
                
                # McNemar's Table
                table = [[a, b], [c, d]]
                
                # Exact=True is better for small samples, but False is standard McNemar (Chi-Squared approximation)
                # If b+c < 25, exact is recommended.
                use_exact = (b + c) < 25
                stat = mcnemar(table, exact=use_exact)
                
                p_value = stat.pvalue
                significant = p_value < 0.05
                
                results.append({
                    'Model A': m1,
                    'Model B': m2,
                    'P-Value': p_value,
                    'Significant': 'YES' if significant else 'NO',
                    'Samples': len(pair_data),
                    'Disagreements': b + c
                })
        
        # Save results
        results_df = pd.DataFrame(results)
        results_df.sort_values('P-Value', inplace=True)
        
        os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
        results_df.to_csv(OUTPUT_PATH, index=False)
        
        print(f"✅ Significance results saved to {OUTPUT_PATH}")
        print(results_df.head())
        
    except Exception as e:
        print(f"❌ Analysis failed: {e}")

if __name__ == "__main__":
    calculate_significance()
