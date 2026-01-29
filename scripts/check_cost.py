import pandas as pd

try:
    df = pd.read_csv('web/public/audit_log.csv')
    print("Cost stats:")
    if 'cost' in df.columns:
        print(df['cost'].describe())
    elif 'run_cost' in df.columns:
        print(df['run_cost'].describe())
    else:
        print("No cost column found")
        
except Exception as e:
    print(e)
