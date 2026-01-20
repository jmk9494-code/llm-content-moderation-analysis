import os
import pandas as pd
from openai import OpenAI
from src.database import get_session, AuditResult, ModelRegistry
from src.config import settings
from src.logger import logger
from sqlalchemy import select

def generate_weekly_report(output_dir=".", report_file="data/latest_report.md"):
    """
    Analyzes the latest audit log from the DB and uses an LLM to generate an executive summary.
    """
    logger.info("📊 Starting AI Analyst analysis...")
    
    session = get_session()
    try:
        # Fetch data using pandas and sqlalchemy
        # We join on ModelRegistry to ensure we have model details if needed, 
        # but for now just the results table is fine.
        query = select(AuditResult.model_id.label("model"), AuditResult.verdict, AuditResult.prompt_id, AuditResult.response_text)
        df = pd.read_sql(query, session.bind)
        
        if df.empty: 
            logger.warning("⚠️ No audit log found to analyze.")
            return

        # 1. Calculate Stats
        total_prompts = len(df)
        models = df['model'].unique()
        
        stats_text = f"Total Prompts Tested: {total_prompts}\nModels Audited: {', '.join(models)}\n\n"
        
        for m in models:
            m_df = df[df['model'] == m]
            refusal_rate = (m_df['verdict'] == 'REMOVED').mean() * 100
            stats_text += f"- {m}: {refusal_rate:.1f}% Refusal Rate\n"

        # 2. Find Disagreements (where models differ on the same prompt)
        examples = ""
        if 'prompt_id' in df.columns:
            pivot = df.pivot_table(index='prompt_id', columns='model', values='verdict', aggfunc='first')
            
            disagreements = []
            for idx, row in pivot.iterrows():
                # Filter out NaNs if models didn't answer all prompts
                valid_verdicts = row.dropna()
                if len(valid_verdicts.unique()) > 1:
                    disagreements.append(f"Prompt {idx}: {dict(valid_verdicts)}")
            
            # Limit disagreements to 5 examples to save tokens
            examples = "\n".join(disagreements[:5])

        # 3. Prompt the Analyst
        prompt = f"""
        You are an expert AI Safety Researcher writing a weekly executive summary for a content moderation audit.
        
        Here is the data from this week's audit:
        {stats_text}
        
        Key Disagreements (where models returned different verdicts):
        {examples}
        
        Write a concise, professional standard markdown report (2-3 paragraphs) summarizing:
        1. Which models were the strictest/most permissible.
        2. Any interesting patterns in disagreements (if provided).
        3. A concluding sentence on the "Safety Vibe" of the week.
        
        Use formatting (bolding, lists) to make it readable. Title it "🛡️ Weekly Executive Summary".
        Ensure there are BLANK LINES between paragraphs for readability.
        """

        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key
        )

        response = client.chat.completions.create(
            model="openai/gpt-4o-mini", # Use a smart but cost-effective model
            messages=[
                {"role": "system", "content": "You are a helpful AI analyst."},
                {"role": "user", "content": prompt}
            ]
        )
        
        report_content = response.choices[0].message.content
        
        # Ensure output dir exists
        full_path = os.path.join(output_dir, report_file)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        with open(full_path, "w") as f:
            f.write(report_content)
            
        logger.info(f"✅ Generated Analyst Report: {full_path}")
        
    except Exception as e:
        logger.error(f"⚠️ Failed to generate analyst report: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    generate_weekly_report()
