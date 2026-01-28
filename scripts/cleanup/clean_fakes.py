import pandas as pd
import os

def clean_fakes():
    file = 'audit_log.csv'
    if not os.path.exists(file): return
    
    df = pd.read_csv(file, on_bad_lines='skip')
    
    # Whitelist of known real model substrings to keep
    # or Blacklist of fakes
    fakes = ['gpt-5', 'claude-haiku-4.5', 'grok-4.1', 'gemini-3']
    
    original_len = len(df)
    
    # Filter out rows where model name contains any fake string
    df = df[~df['model'].str.contains('|'.join(fakes), case=False, na=False)]
    
    print(f"Removed {original_len - len(df)} fake rows.")
    
    # Save back to root AND web/public
    df.to_csv('audit_log.csv', index=False)
    df.to_csv('web/public/audit_log.csv', index=False)
    print(" synced to web/public/audit_log.csv")

if __name__ == "__main__":
    clean_fakes()
