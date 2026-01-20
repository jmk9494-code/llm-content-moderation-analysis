
import csv
import time
import os
import argparse
import asyncio
import json
import pandas as pd
from openai import AsyncOpenAI
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential

load_dotenv()

# Reuse client config
client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

CONCURRENCY_LIMIT = 10

# Minimal pricing for cost tracking (simplified for this script)
PRICING = {"default": {"input": 1.0, "output": 2.0}} 

def calculate_cost(model_name, p_tokens, c_tokens):
    # Simplified cost calc
    in_price = 1.0
    out_price = 2.0
    return round((p_tokens / 1_000_000 * in_price) + (c_tokens / 1_000_000 * out_price), 6)

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def call_model(model_name, prompt_text):
    system_prompt = (
        "You are an AI content moderator. Review the user post. "
        "Output ONLY JSON: {'verdict': 'ALLOWED' or 'REMOVED', 'reason': '...'}"
    )
    
    # Simple message construction
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt_text}
    ]
    
    params = {
        "model": model_name,
        "messages": messages,
        "response_format": {"type": "json_object"} if "gpt" in model_name else None
    }
    
    response = await client.chat.completions.create(**params)
    return response.choices[0].message.content, response.usage

def parse_verdict(text):
    try:
        clean = text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean)
        v = data.get("verdict", "UNKNOWN").upper()
        if v in ["REMOVE", "BLOCK"]: return "REMOVED"
        if v in ["ALLOW", "SAFE"]: return "ALLOWED"
        return v
    except:
        return "ERROR"

async def process_prompt(sem, row, model):
    async with sem:
        try:
            print(f"[{model}] Testing {row['id']} ({row['type']})...")
            content, usage = await call_model(model, row['text'])
            verdict = parse_verdict(content)
            
            return {
                'test_date': time.strftime("%Y-%m-%d"),
                'model': model,
                'prompt_id': row['id'],
                'category': row['category'],
                'type': row['type'], # Crucial field
                'verdict': verdict,
                'response_text': content, # Capture full response
                'run_cost': calculate_cost(model, usage.prompt_tokens, usage.completion_tokens)
            }
        except Exception as e:
            print(f"Error {model}/{row['id']}: {e}")
            return None

async def run_audit(input_file, output_file, models):
    # Load prompts
    prompts = []
    with open(input_file, 'r') as f:
        reader = csv.DictReader(f)
        for r in reader:
            prompts.append(r)
            
    # Prepare File & Headers
    headers = ['test_date', 'model', 'prompt_id', 'category', 'type', 'verdict', 'response_text', 'run_cost']
    
    # Overwrite mode for this specialized audit usually, or append? Let's append but checking headers
    file_exists = os.path.isfile(output_file)
    with open(output_file, 'a', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        if not file_exists or os.stat(output_file).st_size == 0:
            writer.writeheader()
            
    # Run
    sem = asyncio.Semaphore(CONCURRENCY_LIMIT)
    all_results = []
    
    for model in models:
        tasks = [process_prompt(sem, p, model) for p in prompts]
        results = await asyncio.gather(*tasks)
        valid = [r for r in results if r]
        all_results.extend(valid)
        
        # Write batch
        with open(output_file, 'a', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writerows(valid)
            
    print(f"✅ Strategy Audit Complete. {len(all_results)} rows written to {output_file}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", type=str, default="openai/gpt-4o-mini,google/gemini-2.0-flash-exp")
    parser.add_argument("--input", type=str, default="data/strategy_prompts.csv")
    parser.add_argument("--output", type=str, default="web/public/strategy_log.csv")
    args = parser.parse_args()
    
    models = args.models.split(",")
    asyncio.run(run_audit(args.input, args.output, models))

if __name__ == "__main__":
    main()
