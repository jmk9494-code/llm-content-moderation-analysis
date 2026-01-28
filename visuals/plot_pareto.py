
import os
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import plotly.express as px
from sqlalchemy import create_engine

# Visual Style
sns.set_context("paper")
sns.set_style("whitegrid")
plt.rcParams['font.family'] = 'serif'

import json

DB_PATH = "audit.db"
MODELS_PATH = "data/models.json"

def load_model_registry():
    if not os.path.exists(MODELS_PATH):
        return {}
    with open(MODELS_PATH, 'r') as f:
        models = json.load(f)
        return {m['id']: m for m in models}

MODEL_REGISTRY = load_model_registry()

def get_display_name(model_id):
    if model_id in MODEL_REGISTRY:
        return MODEL_REGISTRY[model_id].get('display_name', MODEL_REGISTRY[model_id].get('name', model_id))
    return model_id.split('/')[-1]

def get_strict_id(model_id):
    if model_id in MODEL_REGISTRY:
        return MODEL_REGISTRY[model_id].get('strict_id', model_id)
    return model_id

def load_data():
    """
    Loads audit results joined with prompt metadata.
    """
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Database {DB_PATH} not found.")
        
    engine = create_engine(f'sqlite:///{DB_PATH}')
    
    query = """
    SELECT 
        r.model_id,
        r.verdict,
        p.id as prompt_id,
        p.category
    FROM audit_results r
    JOIN prompts p ON r.prompt_id = p.id
    """
    
    df = pd.read_sql(query, engine)
    return df

def calculate_metrics(df):
    """
    Calculates False Refusal Rate (FRR) and True Refusal Rate (TRR) per model.
    Assumes XSTest prompts have ids starting with 'xstest_'.
    """
    # Identify Data Sources
    df['is_xstest'] = df['prompt_id'].str.contains('xstest', case=False, na=False)
    
    # Define Refusal
    # Verdicts: REFUSAL, BLOCKED, HARD_REFUSAL imply refusal.
    # We need to standardize normalized verdicts from taxonomy if available, 
    # but here we use the raw 'verdict' column which usually holds high level status.
    # Adjust based on your actual verdict values.
    refusal_keywords = ['REFUSAL', 'BLOCKED', 'Hard Refusal', 'Soft Censorship']
    df['is_refusal'] = df['verdict'].apply(lambda x: any(k in str(x) for k in refusal_keywords))
    
    metrics = []
    
    for model, group in df.groupby('model_id'):
        # False Refusal Rate (FRR): Refusals on Benign (XSTest) data
        benign = group[group['is_xstest'] == True]
        if len(benign) > 0:
            frr = benign['is_refusal'].mean()
        else:
            frr = 0.0 # No benign data available
            
        # True Refusal Rate (TRR): Refusals on Sensitive data
        sensitive = group[group['is_xstest'] == False]
        if len(sensitive) > 0:
            trr = sensitive['is_refusal'].mean()
        else:
            trr = 0.0 # No sensitive data
            
        metrics.append({
            "Model": model,
            "False Refusal Rate (FRR)": frr,
            "True Refusal Rate (TRR)": trr,
            "Total Benign": len(benign),
            "Total Sensitive": len(sensitive)
        })
        
    return pd.DataFrame(metrics)

def plot_pareto_static(metrics_df, output_path="paper/figures/pareto_alignment.pdf"):
    """
    Generates static PDF plot using Seaborn.
    """
    plt.figure(figsize=(8, 6))
    
    sns.scatterplot(
        data=metrics_df, 
        x="False Refusal Rate (FRR)", 
        y="True Refusal Rate (TRR)",
        hue="Model",
        s=100,
        edgecolor='black'
    )
    
    # Add labels
    for i, row in metrics_df.iterrows():
        plt.text(
            row["False Refusal Rate (FRR)"] + 0.01, 
            row["True Refusal Rate (TRR)"] + 0.01, 
            get_display_name(row["Model"]), 
            fontsize=9
        )
        
    plt.title("Alignment Tax: Safety vs. Usability", fontsize=14)
    plt.xlabel("False Refusal Rate (Over-censorship)", fontsize=12)
    plt.ylabel("True Refusal Rate (Safety)", fontsize=12)
    plt.xlim(0, 1.0)
    plt.ylim(0, 1.0)
    
    # Add theoretical optimal region point
    plt.scatter([0], [1], color='green', marker='*', s=200, label='Optimal')
    
    plt.tight_layout()
    plt.savefig(output_path)
    print(f"Static plot saved to {output_path}")
    plt.close()

def plot_pareto_interactive(metrics_df, output_path="visuals/pareto_alignment.html"):
    """
    Generates interactive HTML plot using Plotly.
    """
    fig = px.scatter(
        metrics_df,
        x="False Refusal Rate (FRR)",
        y="True Refusal Rate (TRR)",
        color="Model",
        hover_data=["Total Benign", "Total Sensitive"],
        title="Alignment Tax (Pareto Frontier)",
        range_x=[0, 1],
        range_y=[0, 1],
        hover_name="Model"
    )
    
    # Update hover template to show strict ID
    fig.update_traces(
        hovertemplate="<b>%{hovertext}</b><br>Strict ID: %{customdata[0]}<br>FRR: %{x:.2f}<br>TRR: %{y:.2f}",
        customdata=[[get_strict_id(m) for m in metrics_df['Model']]]
    )
    
    fig.update_traces(marker=dict(size=12, line=dict(width=2, color='DarkSlateGrey')))
    fig.write_html(output_path)
    print(f"Interactive plot saved to {output_path}")

    # Paper Exports
    pdf_path = "paper/figures/pareto_alignment.pdf"
    png_path = "paper/figures/pareto_alignment.png"
    
    try:
        # Static Export
        if not os.path.exists("paper/figures"):
             os.makedirs("paper/figures", exist_ok=True)
             
        fig.write_image(pdf_path, width=1200, height=800)
        print(f"vector plot saved to {pdf_path}")
        
        fig.write_image(png_path, scale=3, width=1200, height=800)
        print(f"high-res plot saved to {png_path}")
    except Exception as e:
        print(f"⚠️ Export failed (missing kaleido?): {e}")

if __name__ == "__main__":
    try:
        df = load_data()
        if df.empty:
            print("No data found in database.")
        else:
            metrics = calculate_metrics(df)
            print(metrics)
            
            # Ensure output directories exist
            os.makedirs("paper/figures", exist_ok=True)
            os.makedirs("visuals", exist_ok=True)
            
            plot_pareto_static(metrics)
            plot_pareto_interactive(metrics)
    except Exception as e:
        print(f"Error: {e}")
