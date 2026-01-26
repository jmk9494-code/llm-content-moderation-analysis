
import pandas as pd
import json
import os
import numpy as np
from scipy.stats import chi2_contingency

def calculate_drift_stats(df):
    """
    Analyzes temporal drift in refusal rates for each model.
    Compares the First Observed Date vs Last Observed Date.
    """
    results = []
    
    # Ensure date format
    df['test_date'] = pd.to_datetime(df['test_date'])
    
    # Group by Model
    models = df['model'].unique()
    
    for model in models:
        m_df = df[df['model'] == model].sort_values('test_date')
        
        dates = m_df['test_date'].dt.date.unique()
        if len(dates) < 2:
            continue # Need at least 2 dates to measure drift
            
        start_date = dates[0]
        end_date = dates[-1]
        
        # Get counts for Start Date
        start_data = m_df[m_df['test_date'].dt.date == start_date]
        start_total = len(start_data)
        start_refusals = len(start_data[start_data['verdict'].isin(['REMOVED', 'REFUSAL'])])
        start_rate = (start_refusals / start_total) * 100 if start_total > 0 else 0
        
        # Get counts for End Date
        end_data = m_df[m_df['test_date'].dt.date == end_date]
        end_total = len(end_data)
        end_refusals = len(end_data[end_data['verdict'].isin(['REMOVED', 'REFUSAL'])])
        end_rate = (end_refusals / end_total) * 100 if end_total > 0 else 0
        
        # Chi-Squared Test
        # Contingency Table: [[Start_Refusals, Start_Allowed], [End_Refusals, End_Allowed]]
        obs = np.array([
            [start_refusals, start_total - start_refusals],
            [end_refusals, end_total - end_refusals]
        ])
        
        # Add small constant to avoid zero division if needed, but chi2 handles zeros reasonably well unless row sums are zero
        try:
            chi2, p_val, dof, expected = chi2_contingency(obs)
            is_significant = p_val < 0.05
        except Exception as e:
            print(f"Stats error for {model}: {e}")
            p_val = 1.0
            is_significant = False
            
        results.append({
            "model": model,
            "start_date": str(start_date),
            "end_date": str(end_date),
            "start_refusal_rate": round(start_rate, 2),
            "end_refusal_rate": round(end_rate, 2),
            "rate_change": round(end_rate - start_rate, 2),
            "p_value": float(f"{p_val:.4f}"),
            "significant_change": is_significant
        })
        
    return results

def run_drift_analysis():
    csv_path = 'web/public/audit_log.csv'
    if not os.path.exists(csv_path):
        csv_path = 'audit_log.csv'
        if not os.path.exists(csv_path):
            print("❌ No audit_log.csv found.")
            return

    print("📈 Analyzing Longitudinal Drift...")
    df = pd.read_csv(csv_path)
    
    analysis_results = calculate_drift_stats(df)
    
    # Save as JSON for frontend
    out_path = 'web/public/drift_report.json'
    with open(out_path, 'w') as f:
        json.dump(analysis_results, f, indent=2)
        
    # Also save as CSV for easy reading
    pd.DataFrame(analysis_results).to_csv('web/public/drift_report.csv', index=False)
    
    print(f"✅ Drift Analysis Complete. Found {len(analysis_results)} models with history.")
    for r in analysis_results:
        sig = "⚠️ SIGNIFICANT" if r['significant_change'] else "Stable"
        print(f"  - {r['model']}: {r['start_refusal_rate']}% -> {r['end_refusal_rate']}% ({sig})")

if __name__ == "__main__":
    run_drift_analysis()
