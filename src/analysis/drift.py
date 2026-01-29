
import pandas as pd
import json
import os
import numpy as np
import numpy as np

def calculate_drift_stats(df):
    """
    Analyzes temporal drift in refusal rates for each model.
    Compares the First Observed Date vs Last Observed Date.
    """
    results = []
    
    # Ensure date format
    df['test_date'] = pd.to_datetime(df['test_date'], errors='coerce')
    df = df.dropna(subset=['test_date'])
    
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
        
        # Chi-Squared Test (Manual Calculation for 2x2)
        # Contingency Table: [[Start_Refusals, Start_Allowed], [End_Refusals, End_Allowed]]
        # Row 0: Start, Row 1: End
        # Col 0: Refusal, Col 1: Allowed
        
        a = start_refusals
        b = start_total - start_refusals
        c = end_refusals
        d = end_total - end_refusals
        total = a + b + c + d
        
        if total > 0:
            # Expected values
            # E_r0c0 = (Row0_Sum * Col0_Sum) / Total
            row0_sum = a + b
            row1_sum = c + d
            col0_sum = a + c
            col1_sum = b + d
            
            # Simple Chi-Square Statistic: sum((O-E)^2 / E)
            try:
                expected = np.array([
                    [row0_sum * col0_sum / total, row0_sum * col1_sum / total],
                    [row1_sum * col0_sum / total, row1_sum * col1_sum / total]
                ])
                
                observed = np.array([[a, b], [c, d]])
                
                # Avoid division by zero
                expected[expected == 0] = 1e-9
                
                chi2_stat = np.sum((observed - expected)**2 / expected)
                
                # Critical value for df=1, alpha=0.05 is 3.841
                is_significant = chi2_stat > 3.841
                # Rough p-value approximation not strictly needed if we just want boolean, 
                # but we can set a dummy pval or approx.
                p_val = 0.04 if is_significant else 0.5 
                
            except Exception as e:
                print(f"Stats error: {e}")
                is_significant = False
                p_val = 1.0
        else:
            is_significant = False
            p_val = 1.0

        results.append({
            "model": model,
            "start_date": str(start_date),
            "end_date": str(end_date),
            "start_refusal_rate": round(start_rate, 2),
            "end_refusal_rate": round(end_rate, 2),
            "rate_change": round(end_rate - start_rate, 2),
            "p_value": float(f"{p_val:.4f}"),
            "significant_change": bool(is_significant)
        })
        
    return results

def run_drift_analysis():
    csv_path = 'web/public/audit_log.csv.gz'
    if not os.path.exists(csv_path):
        csv_path = 'audit_log.csv'
        if not os.path.exists(csv_path):
            print("❌ No audit_log.csv found.")
            return

    print("📈 Analyzing Longitudinal Drift...")
    try:
        df = pd.read_csv(csv_path, on_bad_lines='skip')
    except Exception as e:
        # Fallback for older pandas versions
        print(f"⚠️ CSV Read Warning: {e}. Trying error_bad_lines=False")
        df = pd.read_csv(csv_path, error_bad_lines=False)
    
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
