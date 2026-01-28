import json
import os
import pandas as pd
# import plotly.express as px # Locals

TRACES_PATH = "web/public/assets/traces.json"
OUTPUT_IMG = "paper/figures/nagging_tax.png"
OUTPUT_PDF = "paper/figures/nagging_tax.pdf"

def analyze_nagging_tax():
    print("💰 Calculating Nagging Tax (Wasted Tokens)...")
    
    if not os.path.exists(TRACES_PATH):
        print(f"❌ File not found: {TRACES_PATH}")
        return

    try:
        with open(TRACES_PATH, 'r') as f:
            data = json.load(f)
            
        df = pd.DataFrame(data)
        
        # Filter for Refusals
        # Assuming verdict contains REFUSAL or similar
        df['verdict'] = df['verdict'].astype(str).str.upper()
        refusals = df[df['verdict'].isin(['REFUSAL', 'REMOVED', 'BLOCKED'])].copy()
        
        if refusals.empty:
            print("⚠️  No refusals found in traces.")
            return

        # Estimate Tokens (4 chars = 1 token approx)
        refusals['tokens'] = refusals['response_text'].astype(str).apply(len) / 4.0
        
        # Group by Model
        summary = refusals.groupby('model')['tokens'].mean().reset_index()
        summary = summary.sort_values('tokens', ascending=False)
        summary.rename(columns={'tokens': 'Avg Wasted Tokens'}, inplace=True)
        
        print("\n📊 Nagging Tax (Mean Tokens per Refusal):")
        print(summary)
        
        # Plot
        try:
            import plotly.express as px
            fig = px.bar(
                summary,
                x='model',
                y='Avg Wasted Tokens',
                color='model',
                title="The Nagging Tax: Wasted Tokens per Refusal",
                text='Avg Wasted Tokens'
            )
            
            fig.update_traces(texttemplate='%{text:.1f}', textposition='outside')
            fig.update_layout(
                template='plotly_white',
                xaxis_title="Model",
                yaxis_title="Avg Tokens Generated"
            )
            
            # Export
            data_dir = os.path.dirname(OUTPUT_IMG)
            if not os.path.exists(data_dir):
                 os.makedirs(data_dir, exist_ok=True)
                 
            try:
                fig.write_image(OUTPUT_PDF, width=800, height=600)
                print(f"✅ Vector plot saved to {OUTPUT_PDF}")
                
                fig.write_image(OUTPUT_IMG, scale=3, width=800, height=600)
                print(f"✅ High-res plot saved to {OUTPUT_IMG}")
            except Exception as e:
                print(f"⚠️ Export failed (missing kaleido?): {e}")

        except ImportError:
            print("⚠️  Plotly not found. Saving summary CSV.")
            summary.to_csv("paper/figures/nagging_tax.csv", index=False)
            print("✅ Summary saved to paper/figures/nagging_tax.csv")

        return summary

    except Exception as e:
        print(f"❌ Error analysis economics: {e}")
        return None

if __name__ == "__main__":
    analyze_nagging_tax()
