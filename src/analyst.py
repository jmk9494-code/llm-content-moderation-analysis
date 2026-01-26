import os
import pandas as pd
import numpy as np
from openai import OpenAI
from src.database import get_session, AuditResult
from src.config import settings
from src.logger import logger
from src.statistics import calculate_fleiss_kappa, interpret_kappa
from sqlalchemy import select

def generate_weekly_report(output_dir=".", report_file="data/latest_report.md"):
    """
    Analyst 2.0: Generates a comprehensive research report using advanced statistics.
    """
    logger.info("📊 Starting AI Analyst 2.0 Analysis...")
    
    session = get_session()
    try:
        # Fetch all results
        query = select(AuditResult.model_id.label("model"), \
                       AuditResult.verdict, \
                       AuditResult.prompt_id, \
                       AuditResult.response_text, \
                       AuditResult.cost)
        df = pd.read_sql(query, session.bind)
        
        if df.empty: 
            logger.warning("⚠️ No audit log found to analyze.")
            return

        # --- 1. Reliability Analysis (Fleiss' Kappa) ---
        # Create a matrix: Rows=Prompts, Cols=Verdict Counts (ALLOWED, BLOCKED, REFUSAL, ERROR)
        # We pivot to get counts of each verdict per prompt
        verdict_counts = df.pivot_table(index='prompt_id', columns='verdict', aggfunc='size', fill_value=0)
        
        # Ensure all standard columns exist for consistency
        for v in ['ALLOWED', 'BLOCKED', 'REFUSAL', 'ERROR']:
            if v not in verdict_counts.columns:
                verdict_counts[v] = 0
                
        # Convert to numpy array for statistics module
        ratings_matrix = verdict_counts[['ALLOWED', 'BLOCKED', 'REFUSAL', 'ERROR']].to_numpy()
        kappa = calculate_fleiss_kappa(ratings_matrix)
        kappa_interpretation = interpret_kappa(kappa)

        # --- 2. Cost & Efficiency Leaderboard ---
        model_stats = df.groupby('model').agg({
            'verdict': lambda x: (x == 'REMOVED').mean() * 100, # Refusal Rate
            'cost': 'sum',
            'prompt_id': 'count'
        }).rename(columns={'verdict': 'refusal_rate', 'prompt_id': 'count'})
        
        # Normalize cost per 1000 prompts
        model_stats['cost_per_1k'] = (model_stats['cost'] / model_stats['count']) * 1000
        model_stats = model_stats.sort_values('cost_per_1k')
        
        leaderboard_text = model_stats[['refusal_rate', 'cost_per_1k']].to_markdown(floatfmt=".2f")

        # --- 3. Robustness Analysis (Phrasing Sensitivity) ---
        # Identify prompts that are variants of the same base prompt
        # ID Format: "JB-01", "JB-01-V1", "JB-01-V2" -> Base is "JB-01"
        def get_base_id(pid):
            if "-V" in pid:
                return pid.split("-V")[0]
            return pid
            
        df['base_id'] = df['prompt_id'].apply(get_base_id)
        
        # Calculate how often a model changes its verdict for the same base prompt
        # Group by Model + BaseID, count unique verdicts
        robustness = df.groupby(['model', 'base_id'])['verdict'].nunique().reset_index()
        
        # A "Flip" is when unique verdicts > 1 for a single base prompt
        # We only care about base_ids that actually HAVE variants tested
        # Check which base_ids have > 1 prompt_id associated
        base_id_counts = df.groupby('base_id')['prompt_id'].nunique()
        valid_bases = base_id_counts[base_id_counts > 1].index
        
        robustness_valid = robustness[robustness['base_id'].isin(valid_bases)]
        
        if not robustness_valid.empty:
            flips = robustness_valid[robustness_valid['verdict'] > 1]
            flip_rate = (len(flips) / len(robustness_valid)) * 100
            robustness_text = f"Phrasing Sensitivity: {flip_rate:.1f}% of prompt groups triggered inconsistent verdicts."
        else:
            robustness_text = "No phrasing variants detected in this batch."

        # --- 4. Disagreements (Classic) ---
        examples = ""
        if 'prompt_id' in df.columns:
            pivot = df.pivot_table(index='prompt_id', columns='model', values='verdict', aggfunc='first')
            disagreements = []
            for idx, row in pivot.iterrows():
                valid_verdicts = row.dropna()
                if len(valid_verdicts.unique()) > 1:
                    disagreements.append(f"Prompt {idx}: {dict(valid_verdicts)}")
            examples = "\n".join(disagreements[:5])

        # --- 5. Generate System Prompt ---
        prompt = f"""
        You are an expert AI Safety Researcher writing a "Research Insights Report" for a content moderation audit.
        
        ## Statistical Overview
        - **Inter-Rater Reliability (Fleiss' Kappa)**: {kappa:.3f} ({kappa_interpretation})
        - **Robustness**: {robustness_text}
        
        ## Model Leaderboard (Cost vs Safety)
        {leaderboard_text}
        
        ## Disagreement Examples
        {examples}
        
        ## Instructions
        Write a professional markdown report titled "🛡️ AI Analyst 2.0 Weekly Insights".
        
        1. **Executive Summary**: Synthesize the reliability and robustness scores. Is the ecosystem stable?
        2. **Efficiency Analysis**: Recommend a model based on the "Best Value" (Good safety profile + Low Cost/1k).
        3. **Safety Anomalies**: Discuss the disagreements.
        4. **Conclusion**: A one-sentence "Vibe Check" for the research team.
        
        Use concise bullet points. Avoid filler words.
        """

        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key
        )

        response = client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a data-driven AI safety analyst."},
                {"role": "user", "content": prompt}
            ]
        )
        
        report_content = response.choices[0].message.content
        
        # Ensure output dir exists
        full_path = os.path.join(output_dir, report_file)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        with open(full_path, "w") as f:
            f.write(report_content)
            
        logger.info(f"✅ Generated Analyst 2.0 Report: {full_path}")
        
    except Exception as e:
        logger.error(f"⚠️ Failed to generate analyst report: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    generate_weekly_report()
