
import os
import pandas as pd
import plotly.graph_objects as go
from sqlalchemy import create_engine

DB_PATH = "audit.db"
OUTPUT_PATH = "visuals/polyglot_radar.html"

def load_polyglot_data():
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Database {DB_PATH} not found.")
        
    engine = create_engine(f'sqlite:///{DB_PATH}')
    
    # We need to identify language from prompt_id if not explicit
    query = """
    SELECT 
        r.model_id,
        r.verdict,
        p.id as prompt_id
    FROM audit_results r
    JOIN prompts p ON r.prompt_id = p.id
    WHERE p.id LIKE '%-ZH' OR p.id LIKE '%-RU' OR p.id LIKE '%-AR' OR p.id NOT LIKE '%-%'
    """
    # The WHERE clause is tricky if original IDs have dashes. 
    # Better to fetch all and parse in Python.
    
    query = """
    SELECT 
        r.model_id,
        r.verdict,
        p.id as prompt_id
    FROM audit_results r
    JOIN prompts p ON r.prompt_id = p.id
    """
    
    df = pd.read_sql(query, engine)
    return df

def parse_language(prompt_id):
    if str(prompt_id).endswith("-ZH"): return "Chinese"
    if str(prompt_id).endswith("-RU"): return "Russian"
    if str(prompt_id).endswith("-AR"): return "Arabic"
    # Assuming original English prompts don't have these specific suffixes
    # or that we can identify them. 
    # Let's assume anything else is English/Default if it doesn't match these.
    # Checks for XSTest to exclude it?
    if "xstest" in str(prompt_id).lower(): return "English (Benign)"
    return "English (Sensitive)"

def generate_radar_chart(df):
    df['language'] = df['prompt_id'].apply(parse_language)
    
    # Filter for relevant languages
    target_langs = ["English (Sensitive)", "Chinese", "Russian", "Arabic"]
    df = df[df['language'].isin(target_langs)]
    
    if df.empty:
        print("No polyglot data found.")
        return

    # Normalize Verdict
    refusal_keywords = ['REFUSAL', 'BLOCKED', 'Hard Refusal', 'Soft Censorship']
    df['is_refusal'] = df['verdict'].apply(lambda x: 1 if any(k in str(x) for k in refusal_keywords) else 0)
    
    # Calculate Refusal Rate per Model per Language
    grouped = df.groupby(['model_id', 'language'])['is_refusal'].mean().reset_index()
    
    # Select Top Models for Comparison (to avoid clutter)
    # Let's pick 3 distinct models if available, or just top 3 by volume
    top_models = df['model_id'].value_counts().head(3).index.tolist()
    
    fig = go.Figure()

    for model in top_models:
        subset = grouped[grouped['model_id'] == model]
        # Ensure correct order of axes
        # Merge with template to ensure all langs are present (fill 0 if missing)
        template = pd.DataFrame({'language': target_langs})
        subset = pd.merge(template, subset, on='language', how='left').fillna(0)
        
        fig.add_trace(go.Scatterpolar(
            r=subset['is_refusal'],
            theta=subset['language'],
            fill='toself',
            name=model.split('/')[-1]
        ))
        
    fig.update_layout(
        polar=dict(
            radialaxis=dict(
                visible=True,
                range=[0, 1]
            )
        ),
        title="Polyglot Censorship: Safety Gap by Language",
        showlegend=True
    )
    
    fig.write_html(OUTPUT_PATH)
    print(f"Radar chart saved to {OUTPUT_PATH}")

if __name__ == "__main__":
    try:
        df = load_polyglot_data()
        generate_radar_chart(df)
    except Exception as e:
        print(f"Error: {e}")
