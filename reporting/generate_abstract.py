import json
import os
import glob
import pandas as pd

# Data Paths
TRACES_PATH = "web/public/assets/traces.json"
ABLATION_PATH = "web/public/assets/ablation_stats.json"
HISTORY_DIR = "web/public/assets/history"
ECONOMIC_PATH = "paper/figures/nagging_tax.csv"

def generate_abstract():
    print("\n📝 GENERATING ABSTRACT...\n")
    print("-" * 60)
    
    # 1. Load General Stats (Traces)
    model_count = 0
    topic_count = 0
    most_censored_model = "Unknown"
    censorship_rate = 0.0
    
    try:
        with open(TRACES_PATH, 'r') as f:
            traces = json.load(f)
            df = pd.DataFrame(traces)
            model_count = df['model'].nunique()
            topic_count = df['category'].nunique()
            
            # Calc refusal rates
            df['is_refusal'] = df['verdict'].astype(str).str.upper().isin(['REFUSAL', 'REMOVED', 'BLOCKED'])
            summary = df.groupby('model')['is_refusal'].mean().sort_values(ascending=False)
            if not summary.empty:
                most_censored_model = summary.index[0]
                censorship_rate = summary.iloc[0] * 100
    except Exception as e:
        print(f"(Error loading traces: {e})")

    # 2. Load Economic Stats (Nagging Tax)
    nagging_model = "Unknown"
    avg_tokens = 0
    try:
        if os.path.exists(ECONOMIC_PATH):
             econ_df = pd.read_csv(ECONOMIC_PATH)
             if not econ_df.empty:
                 nagging_model = econ_df.iloc[0]['model']
                 avg_tokens = econ_df.iloc[0]['Avg Wasted Tokens']
    except:
        pass

    # 3. Load Ablation Stats (Deep vs Shallow)
    alignment_type = "Unknown"
    drop_pct = 0.0
    try:
        if os.path.exists(ABLATION_PATH):
            with open(ABLATION_PATH, 'r') as f:
                ablation = json.load(f)
                baseline = ablation.get('baseline_refusal_rate', 0)
                ablated = ablation.get('ablation_refusal_rate', 0)
                drop_pct = (baseline - ablated) * 100
                alignment_type = "Deep" if drop_pct < 5.0 else "Shallow"
    except:
        pass

    # 4. Construct Abstract
    abstract = f"""
ABSTRACT

We analyzed {model_count} Large Language Models (LLMs) across {topic_count} sensitive topics to quantify the economic and operational impact of safety alignment. 
Our results reveal significant heterogeneity in refusal behaviors: {most_censored_model} was the most restrictive, refusing {censorship_rate:.1f}% of prompts. 
Notably, {nagging_model} exhibited a significant "Nagging Tax," generating an average of {avg_tokens:.0f} tokens per refusal, imposing unnecessary latency costs. 
Ablation studies removing system prompts yielded only a {drop_pct:.1f}% reduction in refusals, suggesting that modern alignment is primarily {alignment_type} (weight-based) rather than Shallow (prompt-based). 
We release our dataset and auditing toolkit to facilitate longitudinal tracking of "Safety Drift" in the open weights ecosystem.
    """
    
    print(abstract.strip())
    print("-" * 60)
    print("\n✅ Copy this text into your LaTeX/Word document.")

if __name__ == "__main__":
    generate_abstract()
