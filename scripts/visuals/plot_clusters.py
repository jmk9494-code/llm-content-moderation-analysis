
import os
import pandas as pd
import numpy as np
import pickle
import plotly.express as px
from sqlalchemy import create_engine

# Try importing, but wrap in try-except in case installation is still running 
# (though this script is run after interactive check usually, but good practice if imports fail)
try:
    from sentence_transformers import SentenceTransformer
    import umap
except ImportError:
    print("Libraries not installed yet. Please wait for pip install to finish.")

DB_PATH = "audit.db"
CACHE_PATH = "visuals/embeddings.cache"
OUTPUT_PATH = "visuals/semantic_clusters.html"

def load_data():
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Database {DB_PATH} not found.")
        
    engine = create_engine(f'sqlite:///{DB_PATH}')
    
    # We want prompt text and average refusal rate (or just refusal status per row)
    # The map is of PROMPTS. So each dot is a prompt.
    # Color = Average Refusal Rate (or "Controversial-ness")
    
    query = """
    SELECT 
        p.id,
        p.text,
        p.category,
        AVG(CASE WHEN r.verdict IN ('REFUSAL', 'BLOCKED', 'Hard Refusal', 'Soft Censorship') THEN 1.0 ELSE 0.0 END) as refusal_rate
    FROM prompts p
    JOIN audit_results r ON p.id = r.prompt_id
    GROUP BY p.id
    """
    
    df = pd.read_sql(query, engine)
    return df

def get_embeddings(texts):
    # Check cache
    if os.path.exists(CACHE_PATH):
        print("Loading embeddings from cache...")
        with open(CACHE_PATH, 'rb') as f:
            data = pickle.load(f)
            # Verify length matches (simple check)
            if len(data) == len(texts):
                return data
            else:
                print("Cache mismatch. Recomputing...")
    
    print("Computing embeddings (this may take a moment)...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embeddings = model.encode(texts, show_progress_bar=True)
    
    # Save cache
    with open(CACHE_PATH, 'wb') as f:
        pickle.dump(embeddings, f)
        
    return embeddings

def generate_cluster_map(df):
    if df.empty:
        print("No data to plot.")
        return

    embeddings = get_embeddings(df['text'].tolist())
    
    print("Running UMAP reduction...")
    reducer = umap.UMAP(n_neighbors=15, n_components=2, random_state=42)
    embedding_2d = reducer.fit_transform(embeddings)
    
    df['x'] = embedding_2d[:, 0]
    df['y'] = embedding_2d[:, 1]
    
    print("Generating interactive plot...")
    fig = px.scatter(
        df, 
        x='x', 
        y='y',
        color='refusal_rate',
        hover_data=['text', 'category'],
        color_continuous_scale=['blue', 'red'], # Blue=Safe, Red=Refused
        title='The Island of Censorship: Semantic Map of Forbidden Topics',
        labels={'refusal_rate': 'Refusal Rate'}
    )
    
    fig.update_traces(marker=dict(size=8, opacity=0.8))
    fig.update_layout(
        plot_bgcolor='white',
        xaxis=dict(showgrid=False, zeroline=False, visible=False),
        yaxis=dict(showgrid=False, zeroline=False, visible=False)
    )
    
    fig.write_html(OUTPUT_PATH)
    print(f"Cluster map saved to {OUTPUT_PATH}")

if __name__ == "__main__":
    try:
        df = load_data()
        generate_cluster_map(df)
    except Exception as e:
        print(f"Error: {e}")
