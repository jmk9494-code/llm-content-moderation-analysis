import os
import json
import glob
import pandas as pd
import plotly.express as px
from datetime import datetime

HISTORY_DIR = "web/public/assets/history"
OUTPUT_HTML = "web/public/assets/drift.html"
OUTPUT_PDF = "paper/figures/safety_drift.pdf"
OUTPUT_PNG = "paper/figures/safety_drift.png"

def plot_drift():
    print("📈 Generating Safety Drift Chart...")
    
    history_files = glob.glob(os.path.join(HISTORY_DIR, "traces_*.json"))
    if not history_files:
        print("⚠️  No history files found to plot.")
        return

    records = []
    
    for file_path in history_files:
        filename = os.path.basename(file_path)
        # trace_YYYY-MM-DD.json
        try:
            date_str = filename.replace("traces_", "").replace(".json", "")
            
            with open(file_path, 'r') as f:
                traces = json.load(f)
                
            # data integrity check - if empty list
            if not traces:
                continue

            # Calculate Refusal Rate per Model
            df = pd.DataFrame(traces)
            if df.empty:
                continue
            
            # handle case where model might be missing (use string conversion)
            df['model'] = df['model'].apply(lambda x: str(x) if pd.notnull(x) else "Unknown")
            
            # Standardize verdict
            df['verdict'] = df['verdict'].astype(str).str.upper()
            df['is_refusal'] = df['verdict'].apply(lambda x: 1 if x in ['REMOVED', 'REFUSAL'] else 0)
            
            summary = df.groupby('model')['is_refusal'].mean().reset_index()
            summary['date'] = date_str
            summary.rename(columns={'is_refusal': 'refusal_rate'}, inplace=True)
            
            records.extend(summary.to_dict('records'))
            
        except Exception as e:
            print(f"❌ Error processing {filename}: {e}")

    if not records:
        print("⚠️  No valid data extracted.")
        return

    plot_df = pd.DataFrame(records)
    plot_df['date'] = pd.to_datetime(plot_df['date'])
    plot_df = plot_df.sort_values('date')
    
    # Plot
    fig = px.line(
        plot_df, 
        x='date', 
        y='refusal_rate', 
        color='model',
        markers=True,
        title='Safety Drift: Refusal Rate Over Time',
        labels={'refusal_rate': 'Refusal Rate', 'date': 'Audit Date', 'model': 'Model'}
    )
    
    fig.update_layout(
        yaxis_tickformat='.0%', 
        yaxis_range=[0, 1],
        template="plotly_white",
        hovermode="x unified"
    )
    
    # Standard HTML
    fig.write_html(OUTPUT_HTML)
    print(f"✅ Interactive Drift Chart saved to {OUTPUT_HTML}")
    
    # Paper Exports
    try:
        if not os.path.exists("paper/figures"):
             os.makedirs("paper/figures", exist_ok=True)
             
        fig.write_image(OUTPUT_PDF, width=1200, height=800)
        print(f"✅ Vector plot saved to {OUTPUT_PDF}")
        
        fig.write_image(OUTPUT_PNG, scale=3, width=1200, height=800)
        print(f"✅ High-res plot saved to {OUTPUT_PNG}")
    except Exception as e:
         print(f"⚠️ Export failed (missing kaleido?): {e}")

if __name__ == "__main__":
    plot_drift()
