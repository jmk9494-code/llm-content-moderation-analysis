import pandas as pd
import os

def clean_errors():
    files = ['audit_log.csv', 'web/public/audit_log.csv']
    
    for f in files:
        if not os.path.exists(f): 
            continue
            
        print(f"Cleaning {f}...")
        df = pd.read_csv(f, on_bad_lines='skip')
        
        initial_count = len(df)
        
        # Remove ERROR verdicts
        df = df[df['verdict'] != 'ERROR']
        # Remove SYSTEM ERROR text
        df = df[~df['response_text'].str.contains('SYSTEM ERROR', na=False)]
        
        # Also remove deprecated models explicitly if any remain 
        # (though ERROR check usually catches them if they failed 100%)
        deprecated = ['google/gemini-pro-1.5', 'google/gemini-flash-1.5']
        df = df[~df['model'].isin(deprecated)]
        
        # Remove completely failed models (Yi-34B, Mistral Medium) if they have NO valid data
        # Check if they have 0 valid rows? No, just removing errors is safer. 
        # But if a model has ONLY errors, it will disappear naturally.
        
        print(f"  Removed {initial_count - len(df)} bad rows.")
        df.to_csv(f, index=False)

if __name__ == "__main__":
    clean_errors()
