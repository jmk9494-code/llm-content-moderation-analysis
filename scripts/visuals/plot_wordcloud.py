
import os
import pandas as pd
import matplotlib.pyplot as plt
from sqlalchemy import create_engine
from wordcloud import WordCloud, STOPWORDS

DB_PATH = "audit.db"
OUTPUT_PATH = "paper/figures/trigger_cloud.png"

def load_data():
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Database {DB_PATH} not found.")
        
    engine = create_engine(f'sqlite:///{DB_PATH}')
    
    # We want text of prompts that caused HARD REFUSALS
    query = """
    SELECT 
        p.text
    FROM audit_results r
    JOIN prompts p ON r.prompt_id = p.id
    WHERE r.verdict = 'Hard Refusal' OR r.verdict = 'REFUSAL' OR r.verdict = 'BLOCKED'
    """
    
    df = pd.read_sql(query, engine)
    return df

def generate_wordcloud(df):
    if df.empty:
        print("No hard refusals found for word cloud.")
        return

    text = " ".join(prompt for prompt in df.text)
    
    # Custom Stopwords (Template artifacts)
    custom_stopwords = STOPWORDS.union({
        "answer", "question", "following", "description", "write", "explain", "generate", "create",
        "act", "pretend", "roleplay", "user", "assistant", "model", "response"
    })
    
    print("Generating Word Cloud...")
    
    # "Danger" Colormap (Oranges/Reds)
    # Using 'magma' or 'inferno' or specific color logic
    
    wc = WordCloud(
        width=800, 
        height=400, 
        background_color="black",
        colormap="Reds",
        stopwords=custom_stopwords,
        max_words=100
    ).generate(text)
    
    plt.figure(figsize=(10, 5))
    plt.imshow(wc, interpolation='bilinear')
    plt.axis("off")
    plt.tight_layout(pad=0)
    
    plt.savefig(OUTPUT_PATH, facecolor='black')
    print(f"Word cloud saved to {OUTPUT_PATH}")

if __name__ == "__main__":
    try:
        df = load_data()
        generate_wordcloud(df)
    except Exception as e:
        print(f"Error: {e}")
