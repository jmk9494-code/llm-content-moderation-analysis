import pandas as pd

try:
    df = pd.read_csv('web/public/audit_log.csv')
    print("Verdict counts:")
    print(df['verdict'].value_counts())
    
    # Also check if response_text contains "REMOVED"
    if 'response_text' in df.columns:
        removed_in_response = df['response_text'].astype(str).str.contains('"verdict": "REMOVED"', na=False).sum()
        print(f"\nRows with 'REMOVED' in response_text JSON: {removed_in_response}")

except Exception as e:
    print(e)
