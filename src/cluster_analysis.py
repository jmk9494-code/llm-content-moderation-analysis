
import json
import sqlite3
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import CountVectorizer
# Import sentence_transformers inside a try-block to avoid crashing if run locally without it
try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

DB_PATH = "audit.db"
OUTPUT_FILE = "web/public/clusters.json"

def get_refusals():
    """Fetch all refusals from DB."""
    conn = sqlite3.connect(DB_PATH)
    query = "SELECT response_text, model_id, prompt_id FROM audit_results WHERE verdict = 'REFUSAL'"
    df = pd.read_sql_query(query, conn)
    conn.close()
    return df

def extract_top_terms(texts, n_top=5):
    """Extract common keywords from a cluster of texts."""
    try:
        vec = CountVectorizer(stop_words='english', max_features=n_top)
        vec.fit(texts)
        return list(vec.vocabulary_.keys())
    except:
        return []

def main():
    if SentenceTransformer is None:
        print("❌ Error: 'sentence-transformers' not installed. Please run inside Docker.")
        return

    print("Loading data...")
    df = get_refusals()
    
    if df.empty:
        print("No refusals found to analyze.")
        # Write empty JSON to avoid frontend crashing
        with open(OUTPUT_FILE, 'w') as f:
            json.dump([], f)
        return

    print(f"Found {len(df)} refusals. Generating embeddings...")
    
    # Load Model (Small & Fast)
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embeddings = model.encode(df['response_text'].tolist(), show_progress_bar=True)

    # Clustering
    n_clusters = min(5, len(df)) # Don't over-cluster small data
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    df['cluster'] = kmeans.fit_predict(embeddings)

    # --- NEW: Semantic Similarity ---
    print("Calculating nearest neighbors...")
    from sklearn.metrics.pairwise import cosine_similarity
    
    # Calculate similarity matrix
    sim_matrix = cosine_similarity(embeddings)
    
    # For each row, find top 5 similar (excluding self)
    similarity_data = {}
    for idx, row in df.iterrows():
        # Get indices of sorted similarities (descending), exclude self (idx 0 in sorted list usually)
        # Note: idx is DataFrame index, local array index matches if we haven't filtered df after encoding
        # BUT df might have non-sequential index if we filtered before. 
        # Safe way: use integer position 'i'
        
        # We need to map dataframe index to matrix index. 
        # Since we encoded 'df['response_text'].tolist()', matrix row i corresponds to df.iloc[i]
        
        # This loop logic needs to be robust:
        pass 
        
    # Re-loop with localized index 'i'
    similarity_list = []
    
    for i in range(len(embeddings)):
        # Get scores for this item
        scores = sim_matrix[i]
        # Sort indices by score desc
        top_indices = np.argsort(scores)[::-1][1:6] # Skip 0 (self), take next 5
        
        matches = []
        for match_i in top_indices:
            match_row = df.iloc[match_i]
            matches.append({
                "prompt_id": match_row['prompt_id'],
                "model": match_row['model_id'],
                "response": match_row['response_text'][:150] + "...",
                "score": float(scores[match_i])
            })
            
        full_row = df.iloc[i]
        similarity_list.append({
            "id": f"{full_row['model_id']}_{full_row['prompt_id']}", # Logic key
            "prompt_id": full_row['prompt_id'],
            "model": full_row['model_id'],
            "similar": matches
        })
        
    # Save Similarity Data
    with open('web/public/similarity.json', 'w') as f:
        json.dump(similarity_list, f, indent=2)

    # Compile Results (Clusters)
    results = []
    print("Analyzing clusters...")
    
    for i in range(n_clusters):
        cluster_df = df[df['cluster'] == i]
        exemplar = cluster_df.iloc[0]['response_text'] # Simplistic for now
        keywords = extract_top_terms(cluster_df['response_text'])
        
        results.append({
            "cluster_id": int(i),
            "size": int(len(cluster_df)),
            "keywords": keywords,
            "exemplar": exemplar[:200] + "...",
            "models": cluster_df['model_id'].value_counts().to_dict()
        })

    # Save
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"✅ Analysis complete! Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
