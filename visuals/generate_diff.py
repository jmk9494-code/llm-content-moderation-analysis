
import os
import pandas as pd
import difflib
from sqlalchemy import create_engine
import html

DB_PATH = "audit.db"
OUTPUT_PATH = "paper/figures/qualitative_comparison.html"

def load_data():
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Database {DB_PATH} not found.")
        
    engine = create_engine(f'sqlite:///{DB_PATH}')
    
    # Get prompts with >1 responses from different models
    query = """
    SELECT 
        r.model_id,
        r.verdict,
        r.response_text,
        p.text as prompt_text,
        p.id as prompt_id
    FROM audit_results r
    JOIN prompts p ON r.prompt_id = p.id
    WHERE r.response_text IS NOT NULL
    """
    return pd.read_sql(query, engine)

def generate_diff(df):
    # Identify a high-variance prompt
    # i.e., at least one REFUSAL and one ALLOWED/SAFE response for the same prompt
    
    refusal_keywords = ['REFUSAL', 'BLOCKED', 'Hard Refusal']
    df['is_refusal'] = df['verdict'].apply(lambda x: any(k in str(x) for k in refusal_keywords))
    
    candidates = []
    
    for prompt, group in df.groupby('prompt_text'):
        has_refusal = group['is_refusal'].any()
        has_answer = (~group['is_refusal']).any()
        
        if has_refusal and has_answer:
            candidates.append(group)
            
    if not candidates:
        print("No high-variance prompts found (Mixed Refusal/Answer).")
        return

    # Pick the candidate with the most distinct models or just the first one
    # Let's pick one with distinct text lengths to show visible diff
    # Or just the first one for demonstration
    selected_group = candidates[0]
    prompt_text = selected_group['prompt_text'].iloc[0]
    
    # Pick two contrasting models
    refusal_run = selected_group[selected_group['is_refusal']].iloc[0]
    answer_run = selected_group[~selected_group['is_refusal']].iloc[0]
    
    model_a = refusal_run['model_id'].split('/')[-1]
    text_a = refusal_run['response_text']
    
    model_b = answer_run['model_id'].split('/')[-1]
    text_b = answer_run['response_text']
    
    # Generate Diff
    d = difflib.HtmlDiff()
    html_content = d.make_file(
        text_a.splitlines(), 
        text_b.splitlines(), 
        fromdesc=f"Model A: {model_a} (Refusal)", 
        todesc=f"Model B: {model_b} (Answer)",
        context=True,
        numlines=2
    )
    
    # Inject Custom CSS for better academic look
    custom_css = """
    <style>
        body { font-family: 'Times New Roman', serif; margin: 20px; }
        h1 { text-align: center; }
        .diff { width: 100%; border-collapse: collapse; border: 1px solid #ccc; }
        .diff th { background: #f0f0f0; border-bottom: 1px solid #ccc; font-family: sans-serif; }
        .diff_header { background-color: #e0e0e0; }
        .diff_next { background-color: #c0c0c0; }
        .diff_add { background-color: #e6ffec; } /* Greenish for add */
        .diff_chg { background-color: #ffffd7; } /* Yellow for change */
        .diff_sub { background-color: #ffebe9; } /* Reddish for sub (Refusal often appears here if we compare Refusal -> Answer) */
    </style>
    """
    
    full_html = f"""
    <html>
    <head>
        <title>Qualitative Comparison</title>
        {custom_css}
    </head>
    <body>
        <h1>Qualitative Nuance: Refusal vs. Answer</h1>
        <h3>Prompt: "{html.escape(prompt_text)}"</h3>
        {html_content}
    </body>
    </html>
    """
    
    with open(OUTPUT_PATH, 'w') as f:
        f.write(full_html)
        
    print(f"Diff visual saved to {OUTPUT_PATH}")

if __name__ == "__main__":
    try:
        df = load_data()
        generate_diff(df)
    except Exception as e:
        print(f"Error: {e}")
