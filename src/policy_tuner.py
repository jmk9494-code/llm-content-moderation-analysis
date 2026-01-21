
import asyncio
import pandas as pd
import argparse
from openai import AsyncOpenAI
from src.config import settings
from src.logger import logger

# Configuration
OPTIMIZER_MODEL = "openai/gpt-4o"  # Use a smart model for meta-prompting

async def analyze_failures(audit_file: str, category: str = None):
    """
    Reads audit logs, identifies failures, and generates a policy patch.
    """
    logger.info(f"Reading audit log: {audit_file}")
    try:
        df = pd.read_csv(audit_file)
    except Exception as e:
        logger.error(f"Failed to read file: {e}")
        return

    # Filter for failures (Refusals that should be Safe, or vice versa)
    # Ideally, we rely on 'human_verdict' if available, otherwise heuristics or weak labels
    # For now, let's assume we are looking for 'refusal' verdicts in categories that should be safe?
    # Or actually, we look at the /grading output which has 'human_verdict'
    
    if 'human_verdict' in df.columns:
        # Use high-quality human labels
        failures = df[df['original_verdict'] != df['human_verdict']]
        logger.info(f"Found {len(failures)} human-labeled failures.")
    else:
        # User heuristics: e.g. looking for refusals in 'safe' categories
        # This is harder to guess without ground truth. 
        # Let's assume the user provides a file of *just* failures or we assume 'refusal' is bad for 'marketing_copy' etc.
        # For this v1, checking for 'Refusal' in 'creative_writing' or similar might be valid?
        # But let's stick to the prompt: "Input: audit_log.csv (specifically failures)"
        # So we filter for verdict="refusal" generally? No, that's too broad.
        
        # Heuristic: Filter for rows where verdict is 'refusal' but category implies safety?
        # Better: Just take ALL inputs provided and ask the optimizer to fix them.
        failures = df[df['verdict'] == 'refusal'] 
        if category:
            failures = failures[failures['category'] == category]
            
        logger.info(f"Analyzing {len(failures)} refusals (Heuristic: assuming these are FALSE POSITIVES for optimization demo).")

    if failures.empty:
        logger.warning("No failures found to analyze.")
        return

    # Prepare context for the Optimizer
    examples = []
    for _, row in failures.head(10).iterrows(): # Limit context
        examples.append(f"Prompt: {row.get('prompt', '')}\nModel Parsed Verdict: {row.get('verdict', '')}\nResponse Snippet: {str(row.get('response', ''))[:200]}...")

    examples_text = "\n---\n".join(examples)

    system_prompt = f"""
    You are an expert AI Policy Optimizer. 
    Your goal is to write a System Prompt that enables an LLM to handle the following edge cases correctly.
    
    The user is complaining that the model is OVER-REFUSING (i.e., False Positives).
    Below are examples of prompts that were refused but should likely be allowed (or at least handled better).
    
    Analyze the common patterns in these failures.
    Then, write a new System Prompt (or a patch paragraph) that explicitly instructs the model how to handle this nuance.
    
    Format your response as:
    ### Analysis
    [Analysis of why it failed]
    
    ### Suggested System Prompt
    [The new prompt text]
    """

    user_message = f"Here are the failure cases:\n\n{examples_text}"

    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.openrouter_api_key,
    )

    logger.info("Sending failure cases to Optimizer Model...")
    try:
        response = await client.chat.completions.create(
            model=OPTIMIZER_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]
        )
        
        suggestion = response.choices[0].message.content
        
        # Save output
        timestamp = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
        filename = f"policy_suggestion_{timestamp}.md"
        with open(filename, "w") as f:
            f.write(suggestion)
            
        logger.info(f"Optimization complete. Recommendation saved to {filename}")
        print(f"\n--- Policy Tuner Recommendation ---\n{suggestion}")

    except Exception as e:
        logger.error(f"Optimization failed: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Automated Policy Tuner")
    parser.add_argument("--input", type=str, default="public/audit_log.csv", help="Path to audit log or failures file")
    parser.add_argument("--category", type=str, help="Specific category to optimize for")
    
    args = parser.parse_args()
    
    asyncio.run(analyze_failures(args.input, args.category))
