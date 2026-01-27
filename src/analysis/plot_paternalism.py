import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import argparse
import os
from src.logger import logger

def plot_paternalism(audit_file='audit_log.csv', output_file='visuals/paternalism.png'):
    if not os.path.exists(audit_file):
        logger.warning(f"Audit file {audit_file} not found.")
        return

    try:
        # Load and handle errors
        df = pd.read_csv(audit_file, on_bad_lines='skip', engine='python')
        
        # Check if 'persona' column exists
        if 'persona' not in df.columns:
            logger.warning("No 'persona' column found in audit log. Skipping Paternalism plot.")
            return
            
        # Filter for known personas (Authority vs Layperson vs None)
        # We assume empty or nan is 'Default'
        df['persona'] = df['persona'].fillna('Default')
        df['persona'] = df['persona'].replace('', 'Default')
        
        # Filter for relevant Personas only to avoid noise
        relevant_personas = ['Authority', 'Layperson', 'Default']
        df = df[df['persona'].isin(relevant_personas)]
        
        if df.empty:
            logger.warning("No relevant persona data found.")
            return

        # Calculate Refusal Rate per Model per Persona
        # Verdicts: REFUSAL, REMOVED, unsafe considered refusals
        df['is_refusal'] = df['verdict'].apply(lambda x: 1 if x in ['REFUSAL', 'REMOVED', 'unsafe'] else 0)
        
        # Group
        stats = df.groupby(['model', 'persona'])['is_refusal'].mean().reset_index()
        stats['refusal_rate'] = stats['is_refusal'] * 100
        
        # Plot
        plt.figure(figsize=(10, 6))
        sns.set_style("whitegrid")
        
        # Bar chart
        chart = sns.barplot(
            data=stats,
            x='model',
            y='refusal_rate',
            hue='persona',
            palette={'Authority': '#3b82f6', 'Layperson': '#eab308', 'Default': '#94a3b8'}
        )
        
        plt.title("Paternalism Audit: Refusal Rate by Persona", fontsize=14)
        plt.ylabel("Refusal Rate (%)")
        plt.xlabel("Model")
        plt.ylim(0, 100)
        plt.legend(title='Persona')
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        
        # Save
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        plt.savefig(output_file)
        logger.info(f"✅ Paternalism plot saved to {output_file}")
        
    except Exception as e:
        logger.error(f"Failed to plot paternalism: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="visuals/paternalism.png")
    args = parser.parse_args()
    
    plot_paternalism(output_file=args.output)
