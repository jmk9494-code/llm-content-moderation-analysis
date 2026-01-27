
import os
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
from sqlalchemy import create_engine

# Visual Style
sns.set_context("paper")
sns.set_style("white")
plt.rcParams['font.family'] = 'serif'

DB_PATH = "audit.db"
OUTPUT_PATH = "paper/figures/censorship_fingerprint.pdf"

def load_data():
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Database {DB_PATH} not found.")
        
    engine = create_engine(f'sqlite:///{DB_PATH}')
    
    # We want TRR (True Refusal Rate) per category
    # So we filter out XSTest (benign) prompts usually, 
    # but the heatmap is interesting for BOTH benign and sensitive categories.
    # Let's include everything but maybe mark benign categories visually?
    # For now, just raw heatmap of all categories.
    
    query = """
    SELECT 
        r.model_id,
        r.verdict,
        p.category
    FROM audit_results r
    JOIN prompts p ON r.prompt_id = p.id
    """
    
    df = pd.read_sql(query, engine)
    return df

def generate_heatmap(df):
    # Normalize verdicts
    refusal_keywords = ['REFUSAL', 'BLOCKED', 'Hard Refusal', 'Soft Censorship']
    df['is_refusal'] = df['verdict'].apply(lambda x: 1 if any(k in str(x) for k in refusal_keywords) else 0)
    
    # Pivot: Model x Category
    pivot = df.pivot_table(
        index='model_id', 
        columns='category', 
        values='is_refusal', 
        aggfunc='mean'
    )
    
    # Sort for visual clarity
    # Sort models by avg refusal rate
    pivot['mean'] = pivot.mean(axis=1)
    pivot = pivot.sort_values('mean', ascending=False)
    pivot = pivot.drop('mean', axis=1)
    
    # Sort categories by avg refusal rate
    pivot.loc['mean'] = pivot.mean()
    pivot = pivot.sort_values(by='mean', axis=1, ascending=False)
    pivot = pivot.drop('mean', axis=0)
    
    # Clean Model Names
    pivot.index = [x.split('/')[-1] for x in pivot.index]
    
    # Plot
    plt.figure(figsize=(12, 8))
    
    # Diverging palette: Blue (Low Refusal) -> White -> Red (High Refusal)
    sns.heatmap(
        pivot, 
        cmap="vlag", 
        center=0.5, 
        annot=True, 
        fmt=".2f",
        linewidths=.5,
        cbar_kws={'label': 'Refusal Rate'}
    )
    
    plt.title("Censorship Fingerprint: Refusal Rate by Topic", fontsize=14, pad=20)
    plt.xlabel("Topic Category", fontsize=12)
    plt.ylabel("Model", fontsize=12)
    plt.xticks(rotation=45, ha='right')
    
    plt.tight_layout()
    plt.savefig(OUTPUT_PATH)
    print(f"Heatmap saved to {OUTPUT_PATH}")
    plt.close()

if __name__ == "__main__":
    try:
        df = load_data()
        if df.empty:
            print("No data found.")
        else:
            generate_heatmap(df)
            
    except Exception as e:
        print(f"Error: {e}")
