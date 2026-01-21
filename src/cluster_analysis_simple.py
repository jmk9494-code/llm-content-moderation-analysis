
import json
import csv
import collections
import re
import os

INPUT_FILE = "data/audit_log.csv"
OUTPUT_CLUSTERS = "web/public/clusters.json"
OUTPUT_SIMILARITY = "web/public/similarity.json"

def get_top_words(texts, n=5):
    """Simple word frequency counter."""
    words = []
    stopwords = {'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'on', 'for', 'with', 'by', 'at', 'this', 'that', 'it', 'verdict', 'reason', 'removed', 'refusal', 'json'}
    
    for text in texts:
        # Extract words
        clean = re.sub(r'[^a-zA-Z\s]', '', text.lower())
        for w in clean.split():
            if len(w) > 3 and w not in stopwords:
                words.append(w)
                
    counts = collections.Counter(words)
    return [w for w, c in counts.most_common(n)]

def main():
    print("running simple cluster analysis...")
    
    # 1. Read Data
    refusals = []
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                v = row.get('verdict', '').upper()
                if v in ['REFUSAL', 'REMOVED', 'BLOCKED', 'UNSAFE']:
                    # Normalize keys
                    item = {
                        'response': row.get('response_text') or row.get('response', ''),
                        'model': row.get('model') or row.get('model_id', ''),
                        'prompt_id': row.get('prompt_id') or row.get('case_id', ''),
                        'category': row.get('category', 'Uncategorized')
                    }
                    refusals.append(item)
    except FileNotFoundError:
        print("Audit log not found. Creating empty data.")
        refusals = []

    print(f"Found {len(refusals)} refusals.")

    # 2. Heuristic Clustering (Group by Category)
    # Since we can't do semantic embedding without sklearn/torch, 
    # we'll use the 'category' + top keyword as a proxy for clusters.
    
    clusters_map = collections.defaultdict(list)
    for r in refusals:
        cat = r['category']
        clusters_map[cat].append(r)
        
    final_clusters = []
    cluster_id = 1
    
    for cat, items in clusters_map.items():
        if not items: continue
        
        # Calculate stats
        responses = [x['response'] for x in items]
        keywords = get_top_words(responses)
        exemplar = items[0]['response']
        
        models_count = collections.Counter([x['model'] for x in items])
        
        final_clusters.append({
            "cluster_id": cluster_id,
            "size": len(items),
            "keywords": [cat] + keywords, # Add category as a keyword
            "exemplar": exemplar[:200] + "...",
            "models": dict(models_count)
        })
        cluster_id += 1
        
    # Limit to top 6 largest clusters
    final_clusters.sort(key=lambda x: x['size'], reverse=True)
    final_clusters = final_clusters[:6]

    # 3. Save Clusters
    os.makedirs(os.path.dirname(OUTPUT_CLUSTERS), exist_ok=True)
    with open(OUTPUT_CLUSTERS, 'w') as f:
        json.dump(final_clusters, f, indent=2)
        
    # 4. Mock Similarity Data (Since we can't calc nearest neighbors)
    # We'll just link items in the same category randomly
    sim_data = []
    sample_refusals = refusals[:50] # Limit size
    
    for r in sample_refusals:
        # Find others in same category
        same_cat = [x for x in refusals if x['category'] == r['category'] and x != r]
        # Take top 5
        matches = []
        for match in same_cat[:5]:
             matches.append({
                "prompt_id": match['prompt_id'],
                "model": match['model'],
                "response": match['response'][:100] + "...",
                "score": 0.85 # Fake score
            })
            
        sim_data.append({
            "id": f"{r['model']}_{r['prompt_id']}",
            "prompt_id": r['prompt_id'],
            "model": r['model'],
            "similar": matches
        })
        
    with open(OUTPUT_SIMILARITY, 'w') as f:
        json.dump(sim_data, f, indent=2)
        
    print(f"✅ Generated heuristic clusters and similarity data.")

if __name__ == "__main__":
    main()
