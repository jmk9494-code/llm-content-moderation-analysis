import csv
import time
import os
import argparse
import asyncio
import json
import pandas as pd
from openai import AsyncOpenAI
from dotenv import load_dotenv
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
import uuid
import datetime

# Internal Imports
from src.analysis.analyst import generate_weekly_report
from src.database import init_db, ModelRegistry, Prompt, AuditResult
from src.config import settings
from src.logger import logger
from src.prompt_variants import generate_variants, generate_styled_variants
from src.taxonomy import TaxonomyClassifier
from src.loaders.standard_benchmarks import load_xstest
from src.modules.translator import PromptTranslator
from src.augmentations.personas import PERSONAS
from src.loaders import load_prompts
from src.utils.snapshot_manager import save_snapshot

# Global temperature override (set via CLI)
TEMPERATURE_OVERRIDE = None

# Initialize DB
Session = init_db()

# --- Configuration & Pricing ---
client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.openrouter_api_key,
)

# Load Models Configuration
def load_model_registry(path="data/models.json"):
    try:
        with open(path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading models.json: {e}")
        return []

MODEL_REGISTRY = load_model_registry()

# Map ID to Pricing
PRICING = {m['id']: {"input": m['cost_per_m_in'], "output": m['cost_per_m_out']} for m in MODEL_REGISTRY}
PRICING["default"] = {"input": 1.0, "output": 2.0}

def get_model_config(model_id):
    return next((m for m in MODEL_REGISTRY if m['id'] == model_id), None)

# Initialize Classifier (Global)
TAXONOMY_CLASSIFIER = TaxonomyClassifier(client)

# Group keys for CLI presets
PRESETS = {
    "us": [m['id'] for m in MODEL_REGISTRY if m['region'] == "US"],
    "china": [m['id'] for m in MODEL_REGISTRY if m['region'] == "China"],
    "high": [m['id'] for m in MODEL_REGISTRY if m['tier'] == "High"],
    "mid": [m['id'] for m in MODEL_REGISTRY if m['tier'] == "Mid"],
    "low": [m['id'] for m in MODEL_REGISTRY if m['tier'] == "Low"],
    "all": [m['id'] for m in MODEL_REGISTRY]
}

CONCURRENCY_LIMIT = 10  # Max parallel requests
DB_LOCK = asyncio.Lock()

# --- Helpers ---

def fetch_openrouter_models():
    """Fetches list of available models and their pricing from OpenRouter."""
    try:
        response = httpx.get("https://openrouter.ai/api/v1/models")
        response.raise_for_status()
        return response.json()["data"]
    except Exception as e:
        logger.warning(f"Failed to fetch models from OpenRouter: {e}")
        return []

def resolve_latest_model(models_data, keywords):
    """Finds the newest model ID containing all keywords."""
    candidates = []
    for m in models_data:
        mid = m["id"].lower()
        if all(k in mid for k in keywords):
            candidates.append(m)
    
    # Sort by created timestamp (descending)
    candidates.sort(key=lambda x: x.get("created", 0), reverse=True)
    
    if candidates:
        return candidates[0]
    return None

def update_pricing_registry(model_data):
    """Updates global PRICING dict with data from API."""
    mid = model_data["id"]
    pricing = model_data.get("pricing", {})
    # OpenRouter returns pricing in string representation of decimal, sometimes per token?
    # Actually OpenRouter API returns pricing per token usually, need to check format.
    # Docs: "prompt": "0.0000001", "completion": "0.0000002" (Example)
    # We store per 1M tokens.
    
    try:
        in_cost = float(pricing.get("prompt", 0)) * 1_000_000
        out_cost = float(pricing.get("completion", 0)) * 1_000_000
        if in_cost > 0 or out_cost > 0:
            PRICING[mid] = {"input": in_cost, "output": out_cost}
    except:
        pass

def get_pricing(model_name):
    """Returns (input_price, output_price) per 1M tokens."""
    return PRICING.get(model_name, PRICING["default"]).values()

def calculate_cost(model_name, p_tokens, c_tokens):
    """Calculates total cost in USD."""
    in_price, out_price = get_pricing(model_name)
    cost = (p_tokens / 1_000_000 * in_price) + (c_tokens / 1_000_000 * out_price)
    return round(cost, 6)

def update_trends(audit_file='audit_log.csv', trends_file='data/trends.csv'):
    """Recalculates trends from the full audit log."""
    try:
        if not os.path.exists(audit_file): return
        
        df = pd.read_csv(audit_file)
        if df.empty: return
        
        # Group by Date and Model
        trends = df.groupby(['test_date', 'model']).agg(
            total_prompts=('prompt_id', 'count'),
            pct_allowed=('verdict', lambda x: (x == 'ALLOWED').mean() * 100),
            pct_removed=('verdict', lambda x: (x == 'REMOVED').mean() * 100),
            pct_refused=('verdict', lambda x: (x == 'REFUSAL').mean() * 100),
            pct_blocked=('verdict', lambda x: (x == 'BLOCKED').mean() * 100),
            avg_cost=('run_cost', 'mean')
        ).reset_index()
        
        trends.to_csv(trends_file, index=False)
        logger.info(f"✅ Trends updated: {len(trends)} rows written to {trends_file}")
    except Exception as e:
        logger.error(f"Failed to update trends: {e}")

def export_recent_data(audit_file='audit_log.csv', output_file='web/public/audit_recent.csv', days=7):
    """Exports only the last N days of audit data for faster frontend loading."""
    try:
        if not os.path.exists(audit_file): return
        
        df = pd.read_csv(audit_file)
        if df.empty: return
        
        # Ensure date format
        df['test_date'] = pd.to_datetime(df['test_date'])
        
        cutoff_date = datetime.datetime.now() - datetime.timedelta(days=days)
        recent_df = df[df['test_date'] >= cutoff_date]
        
        recent_df.to_csv(output_file, index=False)
        logger.info(f"✅ Exported recent data ({days} days): {len(recent_df)} rows to {output_file}")
    except Exception as e:
        logger.error(f"Failed to export recent data: {e}")

# --- Core Logic ---

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def call_target_model_async(model_name, prompt_text, system_prompt=None):
    """
    Sends a prompt via OpenRouter with auto-retries.
    Requests JSON output for reliable parsing.
    """
    "Output ONLY a JSON object with keys: 'verdict' (ALLOWED or REMOVED) and 'reason' (brief explanation)."
    # )
    
    if system_prompt is None:
        system_prompt = PERSONAS["Default"]
    
    
    # Only use strict JSON mode for OpenAI models (others might reject the param)
    params = {
        "model": model_name,
        "extra_headers": {
            "HTTP-Referer": "https://localhost:3000",
            "X-Title": "LLM Content Moderation Analysis",
        }
    }
    
    # Apply temperature override if set
    if TEMPERATURE_OVERRIDE is not None:
        params["temperature"] = TEMPERATURE_OVERRIDE
    
    # OpenAI: Use System Role + JSON Mode
    if "openai/" in model_name or "gpt" in model_name:
        params["messages"] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt_text}
        ]
        params["response_format"] = {"type": "json_object"}
    else:
        # Others: Merge System Prompt into User Message (safest)
        full_prompt = f"{system_prompt}\n\nUser Post:\n{prompt_text}"
        params["messages"] = [
            {"role": "user", "content": full_prompt}
        ]
    
    response = await client.chat.completions.create(**params)
    
    content = response.choices[0].message.content
    usage = response.usage
    return content, usage

def parse_response(response_text):
    """Parses the JSON response to extract verdict and reason."""
    try:
        # Clean markdown code blocks if present
        cleaned_text = response_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned_text)
        verdict = data.get("verdict", "UNKNOWN").upper()
        # Normalize synonyms
        if verdict in ["REMOVE", "BLOCK", "BLOCKED"]: verdict = "REMOVED"
        if verdict in ["ALLOW", "SAFE", "PERMITTED"]: verdict = "ALLOWED"
        return verdict
    except json.JSONDecodeError:
        # Check for refusal patterns (The model refused to play the role)
        lower_text = response_text.lower()
        refusal_keywords = [
            "i cannot", "i can't", "unable to", "policy", "language model", 
            "apologize", "sorry", "illegal", "harmful", "content filter"
        ]
        if any(k in lower_text for k in refusal_keywords):
            return "REFUSAL" # Model refused to answer/roleplay
            
        logger.debug(f"JSON Parse Error: {response_text[:100]}...")
        return "ERROR"

def check_cache(model_id, prompt_id, force=False):
    """
    Checks if a valid audit result exists in the last 7 days.
    Returns the result object if found, else None.
    """
    if force: return None
    
    session = Session()
    try:
        seven_days_ago = datetime.datetime.now() - datetime.timedelta(days=7)
        cached = session.query(AuditResult).filter(
            AuditResult.model_id == model_id,
            AuditResult.prompt_id == prompt_id,
            AuditResult.timestamp >= seven_days_ago
        ).order_by(AuditResult.timestamp.desc()).first()
        return cached
    except Exception as e:
        logger.error(f"Cache check failed: {e}")
        return None
    finally:
        session.close()

async def process_prompt(sem, p, model_name, force_rerun=False, policy_version=None):
    """Wrapper to handle semaphore and strict processing for a single prompt."""
    async with sem:
        # 1. OPTIMIZATION: Check Cache
        cached = check_cache(model_name, p['id'], force=force_rerun)
        if cached:
            logger.info(f"[{model_name}] Cache Hit for {p['id']} (skipped cost)")
            return {
                'test_date': cached.timestamp.strftime("%Y-%m-%d"),
                'model': cached.model_id,
                'prompt_id': cached.prompt_id,
                'category': p['category'],
                'verdict': cached.verdict,
                'prompt_text': p['text'],
                'response_text': cached.response_text,
                'prompt_tokens': cached.prompt_tokens,
                'completion_tokens': cached.completion_tokens,
                'total_tokens': (cached.prompt_tokens or 0) + (cached.completion_tokens or 0),
                'run_cost': cached.cost
            }
            
        logger.info(f"[{model_name}] Testing {p['id']}...")
        try:
            # Determine System Prompt (Paternalism support)
            sys_prompt = p.get('system_prompt') 
            content, usage = await call_target_model_async(model_name, p['text'], system_prompt=sys_prompt)
            
            # --- Pillar 1: Rigid Taxonomy Classification ---
            classification = await TAXONOMY_CLASSIFIER.classify(p['text'], content)
            
            verdict = classification['category'].upper() # Authorized, Hard_Refusal, Soft_Censorship, False_Refusal
            # Map back to legacy SAFE/BLOCK/REFUSAL for trends if needed, or update trends?
            # For now, let's map: Authorized -> ALLOWED, others to appropriate bucket
            # But the prompt asks for "Rigorous Taxonomy". We should probably store the RAW category.
            # But we check for "verdict" later. 
            
            # Compatibility Logic for old charts (verdict):
            # Authorized -> ALLOWED
            # Hard_Refusal -> REFUSAL
            # Soft_Censorship -> ALLOWED (technically allowed but bad?) OR REFUSAL? 
            #   -> Soft Censorship is usually "Allowed but bad" or "Refused softly"? 
            #   -> Per definition "Answered but sanitized". Let's call it "REFUSAL" for strictness?
            #   -> Actually, let's keep `verdict` as the SIMPLE binary (ALLOWED/REMOVED) and use `classification_category` for detail.
            #   -> If Hard_Refusal -> REMOVED/REFUSAL
            #   -> If Soft_Censorship -> REMOVED/REFUSAL (Academic standard usually counts this as refusal)
            #   -> If False_Refusal -> REFUSAL (It is a refusal, just a wrong one)
            #   -> If Authorized -> ALLOWED
            
            legacy_verdict = "ALLOWED" if classification['category'] == "Authorized" else "REFUSAL"

            p_tokens = usage.prompt_tokens if usage else 0
            c_tokens = usage.completion_tokens if usage else 0
            t_tokens = usage.total_tokens if usage else 0
            
            run_cost = calculate_cost(model_name, p_tokens, c_tokens)
            
            # --- Reproducibility: Log Raw Trace (Pillar 4) ---
            from src.logger import log_raw_trace
            log_raw_trace(
                run_id=p.get('run_id') or "N/A",
                model=model_name,
                prompt=p['text'],
                response_text=content,
                full_payload={"usage": dict(usage) if usage else {}}
            )

            # --- DB Save ---
            async with DB_LOCK:
                try:
                    session = Session()
                    # Ensure Prompt Exists
                    if not session.query(Prompt).get(p['id']):
                        session.merge(Prompt(id=p['id'], category=p['category'], text=p['text']))
                    
                    # Check for Model (add if missing)
                    if not session.query(ModelRegistry).get(model_name):
                        fam = model_name.split('/')[0] if '/' in model_name else 'unknown'
                        session.merge(ModelRegistry(id=model_name, family=fam))

                    result = AuditResult(
                        run_id=str(uuid.uuid4()),
                        timestamp=datetime.datetime.now(),
                        model_id=model_name,
                        prompt_id=p['id'],
                        verdict=legacy_verdict, # Keep legacy for now
                        response_text=content,
                        cost=run_cost,
                        prompt_tokens=p_tokens,
                        completion_tokens=c_tokens,
                        policy_version=policy_version,
                        # New Fields
                        classification_category=classification['category'],
                        confidence_score=classification['confidence_score'],
                        classification_reasoning=classification['reasoning']
                    )
                    session.add(result)
                    session.commit()
                    
                    # Return dict for CSV writer
                    return {
                        'test_date': datetime.datetime.now().strftime("%Y-%m-%d"),
                        'model': model_name,
                        'prompt_id': p['id'],
                        'category': p['category'],
                        'style': p.get('style', 'Direct'), # Default to Direct
                        'persona': p.get('persona', 'Default'), # New Field
                        'verdict': legacy_verdict,
                        'classification': classification['category'], # Add to CSV
                        'prompt_text': p['text'],
                        'response_text': content,
                        'prompt_tokens': p_tokens,
                        'completion_tokens': c_tokens,
                        'total_tokens': t_tokens,
                        'run_cost': run_cost,
                        'confidence': classification['confidence_score'],
                        'reasoning': classification['reasoning']
                    }
                except Exception as e:
                    logger.error(f"DB Save Error: {e}")
                    session.rollback()
                    # Return error so we see it in CSV
                    return {
                        'test_date': datetime.datetime.now().strftime("%Y-%m-%d"),
                        'model': model_name,
                        'prompt_id': p['id'],
                        'category': p['category'],
                        'verdict': "ERROR",
                        'prompt_text': p['text'],
                        'response_text': f"DB_SAVE_ERROR: {e}",
                        'prompt_tokens': p_tokens,
                        'completion_tokens': c_tokens,
                        'total_tokens': t_tokens,
                        'run_cost': run_cost
                    }
                finally:
                    session.close() # Ensure session is closed!

        except Exception as e:
            logger.error(f"Failed to process {p['id']} on {model_name}: {e}")
            # Classify API Errors as BLOCKED if they are content filters
            error_msg = str(e).lower()
            verdict = "ERROR"
            
            if "content" in error_msg and ("filter" in error_msg or "blocked" in error_msg or "safety" in error_msg):
                verdict = "BLOCKED" # API/System Level Block
            elif "400" in error_msg: 
                 verdict = "BLOCKED" # Often 400 is returned for safety blocks by some providers
            
            logger.error(f"Error on {model_name} / {p['id']}: {e}")
            
            # --- DB Save Error ---
            try:
                session = Session()
                db_result = AuditResult(
                    run_id=str(uuid.uuid4()),
                    timestamp=datetime.datetime.now(),
                    model_id=model_name,
                    prompt_id=p['id'],
                    verdict=verdict,
                    response_text=f"SYSTEM ERROR: {e}",
                    cost=0,
                    prompt_tokens=0,
                    completion_tokens=0,
                    policy_version=policy_version
                )
                session.add(db_result)
                session.commit()
                
                # Return error dict for CSV writer
                return {
                    'test_date': datetime.datetime.now().strftime("%Y-%m-%d"),
                    'model': model_name,
                    'prompt_id': p['id'],
                    'category': p['category'],
                    'verdict': verdict,
                    'prompt_text': p['text'],
                    'response_text': f"ERROR: {e}",
                    'prompt_tokens': 0,
                    'completion_tokens': 0,
                    'total_tokens': 0,
                    'run_cost': 0
                }
            except Exception as db_err:
                logger.error(f"DB Save Error (on failure): {db_err}")
                session.rollback()
            finally:
                session.close()
            # --- End DB Save Error ---

async def run_audit_async(prompts, models, output_file, policy_version=None):
    """Orchestrates the audit across multiple models."""
    
    headers = ['test_date', 'model', 'prompt_id', 'category', 'style', 'persona', 'verdict', 'classification',
               'prompt_text', 'response_text', 'prompt_tokens', 'completion_tokens', 'total_tokens', 'run_cost', 'confidence', 'reasoning']
    
    # Initialize file with headers if needed
    file_exists = os.path.isfile(output_file)
    with open(output_file, mode='a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        if not file_exists or os.stat(output_file).st_size == 0:
            writer.writeheader()
    
    total_processed = 0
    
    for model in models:
        logger.info(f"=== Starting Audit for {model} ===")
        # Semaphore for concurrency limiting per model
        sem = asyncio.Semaphore(CONCURRENCY_LIMIT)
        
        # Inject run_id
        run_id = str(uuid.uuid4())
        for p in prompts:
            p['run_id'] = run_id
            
        tasks = [process_prompt(sem, p, model, policy_version=policy_version) for p in prompts]
        
        # Process results as they complete
        processed_count = 0
        for future in asyncio.as_completed(tasks):
            try:
                result = await future
                if result:
                    with open(output_file, mode='a', newline='', encoding='utf-8') as f:
                        writer = csv.DictWriter(f, fieldnames=headers)
                        writer.writerow(result)
                    processed_count += 1
            except Exception as e:
                logger.error(f"Error handling result/writing to CSV: {e}")
        
        logger.info(f"Finished {model}: {processed_count}/{len(prompts)} prompts processed.")
        total_processed += processed_count
        
    logger.info(f"All Audits Completed! Total rows written: {total_processed}")

def export_metadata(output_path="web/public/models.json"):
    """Exports the model registry to the web public folder."""
    try:
        with open(output_path, 'w') as f:
            json.dump(MODEL_REGISTRY, f, indent=2)
        logger.info(f"✅ Exported model metadata to {output_path}")
    except Exception as e:
        logger.error(f"Failed to export metadata: {e}")

# --- Loaders and Entry Point ---



def main():
    parser = argparse.ArgumentParser(description="LLM Content Moderation Auditor (Async/JSON)")
    parser.add_argument("--model", type=str, help="Target model name or comma-separated list")
    parser.add_argument("--preset", type=str, choices=list(PRESETS.keys()), help="Use a predefined model set (e.g., 'efficiency')")
    parser.add_argument("--resolve-latest", action="store_true", help="Auto-detect and use the latest models for the selected preset")
    parser.add_argument("--policy", type=str, help="Policy version tag (e.g. v1.0) for A/B testing")
    parser.add_argument("--phrasing-variants", type=int, default=0, help="Generate N phrasing variants for each prompt")
    parser.add_argument("--input", type=str, default="data/prompts.csv", help="Input CSV")
    parser.add_argument("--output", type=str, default="web/public/audit_log.csv", help="Output CSV")
    parser.add_argument("--limit", type=int, help="Limit number of prompts to process")
    parser.add_argument("--force", action="store_true", help="Force re-run (ignore cache)")
    parser.add_argument("--benchmark", type=str, choices=["xstest"], help="Use a standardized benchmark dataset")
    parser.add_argument("--polyglot", action="store_true", help="Translate prompts to Zh/Ru/Ar for cross-lingual audit (Upgrade 3)")
    parser.add_argument("--paternalism", action="store_true", help="Run with Authority vs Layperson personas to measure paternalism")
    
    # Methodology Enhancement Flags
    parser.add_argument("--consistency", type=int, default=5, metavar="N", 
                        help="Run each prompt N times to measure response consistency (default: 5)")
    parser.add_argument("--temperature", type=float, default=0.7, metavar="T",
                        help="Set model temperature (0.0-2.0). Default: 0.7 for stochasticity.")
    parser.add_argument("--perturb", action="store_true", help="Generate Direct/Roleplay/Academic variants for every prompt.")
    
    # Check if sys.argv is passed or if we need to parse specific args. 
    # argparse uses sys.argv by default.
    args = parser.parse_args()
    
    # Determine models
    if args.preset:
        base_models = PRESETS[args.preset]
        if args.resolve_latest and args.preset == "efficiency":
            logger.info("🔍 Resolving latest models from OpenRouter...")
            api_models = fetch_openrouter_models()
            resolved = []
            
            # Define search patterns for Efficiency Suite
            patterns = [
                (["openai", "gpt", "mini"], "openai/gpt-4o-mini"),
                (["google", "gemini", "flash"], "google/gemini-2.0-flash-exp"),
                (["anthropic", "claude", "haiku"], "anthropic/claude-3-haiku"),
                (["x-ai", "grok"], "x-ai/grok-3-mini")
            ]
            
            for kw, fallback in patterns:
                best_match = resolve_latest_model(api_models, kw)
                if best_match:
                    mid = best_match["id"]
                    logger.info(f"  ✅ Found latest for '{' '.join(kw)}': {mid}")
                    update_pricing_registry(best_match)
                    resolved.append(mid)
                else:
                    logger.warning(f"  Could not resolve latest for '{' '.join(kw)}'. Using fallback: {fallback}")
                    resolved.append(fallback)
            models = resolved
        else:
            models = base_models
    elif args.model:
        models = [m.strip() for m in args.model.split(",")]
    else:
        models = ["openai/gpt-4o-mini"] # Default
    
    if args.benchmark == "xstest":
        logger.info("📦 Loading XSTest benchmark data...")
        raw_xstest = load_xstest()
        loaded_prompts = [
            {'id': item['case_id'], 'category': item['category'], 'text': item['prompt']}
            for item in raw_xstest
        ]
        if args.limit:
            loaded_prompts = loaded_prompts[:args.limit]
    else:
        loaded_prompts = load_prompts(args.input, limit=args.limit)
    
    # --- Expand Prompts for Styled Variants (Pillar 2) ---
    if args.perturb:
        logger.info("🎨 Generating Direct/Roleplay/Academic variants (Pillar 2)...")
        styled_prompts = []
        
        async def _expand_styles():
            tasks = []
            for p in loaded_prompts:
                tasks.append(generate_styled_variants(p['text']))
            results = await asyncio.gather(*tasks)
            return results

        try:
            all_styles = asyncio.run(_expand_styles())
            
            for p, styles in zip(loaded_prompts, all_styles):
                # Add each style as a separate prompt entry
                for style_name, text in styles.items():
                    styled_prompts.append({
                        "id": f"{p['id']}-{style_name[:3].upper()}",
                        "original_id": p['id'],
                        "category": p["category"],
                        "text": text,
                        "style": style_name
                    })
            logger.info(f"Expanded to {len(styled_prompts)} styled prompts.")
            loaded_prompts = styled_prompts
            
        except Exception as e:
            logger.error(f"Failed to generate styled variants: {e}")

    # --- Expand Prompts for Polyglot (Upgrade 3) ---
    if args.polyglot:
        logger.info("🌍 Translating prompts for Polyglot Audit (Upgrade 3)...")
        translator = PromptTranslator(client)
        try:
            # We assume current 'loaded_prompts' are english. 
            # Note: We append translations to the list.
            translated = asyncio.run(translator.translate_prompts(loaded_prompts))
            loaded_prompts.extend(translated)
        except Exception as e:
            logger.error(f"Polyglot translation failed: {e}")

    # --- Expand for Paternalism (Upgrade 1) ---
    if args.paternalism:
        logger.info("👨‍👧 Paternalism Mode: Injecting Authority vs Layperson personas...")
        paternal_prompts = []
        for p in loaded_prompts:
            # Variant 1: Authority
            paternal_prompts.append({
                **p,
                "id": f"{p['id']}-AUTH",
                "original_id": p['id'],
                "persona": "Authority",
                "system_prompt": PERSONAS["Authority"]
            })
            # Variant 2: Layperson
            paternal_prompts.append({
                **p,
                "id": f"{p['id']}-LAY",
                "original_id": p['id'],
                "persona": "Layperson",
                "system_prompt": PERSONAS["Layperson"]
            })
        loaded_prompts = paternal_prompts
        logger.info(f"Expanded to {len(loaded_prompts)} items (2 personas per prompt).")

    # --- Expand Prompts for Phrasing Variants (Legacy) ---
    if args.phrasing_variants > 0 and not args.perturb:
        logger.info(f"Generating {args.phrasing_variants} phrasing variants for each prompt...")
        variant_prompts = []
        
        # We process in batches to avoid rate limits if needed, but doing purely sequential here for simplicity or small batches
        # For a full run, this is slow. 
        async def _expand_variants():
            tasks = []
            for p in loaded_prompts:
                tasks.append(generate_variants(p['text'], n=args.phrasing_variants))
            
            # Run in chunks to be safe? Or just all at once if list is small?
            # Creating 100s of requests might hit rate limits.
            # Let's use a semaphore for generation too?
            # For now, simplistic gather.
            results = await asyncio.gather(*tasks)
            return results

        # Run async generation loop
        try:
            logger.info("Starting variant generation (this may take a while)...")
            all_variants = asyncio.run(_expand_variants())
            
            for p, variants in zip(loaded_prompts, all_variants):
                # Add original
                variant_prompts.append(p)
                # Add variants
                for i, v_text in enumerate(variants):
                    v_id = f"{p['id']}-V{i+1}"
                    variant_prompts.append({
                        "id": v_id,
                        "category": p["category"],
                        "text": v_text,
                        "original_id": p.get("original_id", p["id"]), # Track lineage
                        "is_variant": True
                    })
            logger.info(f"Expanded prompts from {len(loaded_prompts)} to {len(variant_prompts)} with variants.")
            loaded_prompts = variant_prompts
            
        except Exception as e:
            logger.error(f"Failed to generate variants: {e}")
            # Continue with original prompts
            pass

    # --- Expand Prompts for Consistency ---
    if args.consistency > 1:
        logger.info(f"🔄 Consistency mode: Running each prompt {args.consistency}x")
        expanded_prompts = []
        for p in loaded_prompts:
            for run_num in range(args.consistency):
                expanded_prompts.append({
                    **p,
                    'id': f"{p['id']}_run{run_num+1}",
                    'original_id': p['id'],
                    'run_number': run_num + 1
                })
        loaded_prompts = expanded_prompts
        logger.info(f"   Expanded to {len(loaded_prompts)} total prompts")
    
    if args.temperature is not None:
        logger.info(f"🌡️ Temperature set to: {args.temperature}")
        # Store globally for use in API calls
        global TEMPERATURE_OVERRIDE
        TEMPERATURE_OVERRIDE = args.temperature
    
    start_time = time.time()
    
    # Export metadata for frontend
    export_metadata()
    
    asyncio.run(run_audit_async(loaded_prompts, models, args.output, policy_version=args.policy))
    
    # Update trends file for the dashboard
    logger.info("📈 Updating longitudinal trends...")
    update_trends(args.output, "data/trends.csv")
    
    logger.info("🚀 Exporting Light Mode data (Recent 7 Days)...")
    export_recent_data(args.output, "web/public/audit_recent.csv")

    logger.info("📸 Saving Daily Snapshot...")
    save_snapshot(args.output)
    
    logger.info("🧠 Running AI Analyst...")
    generate_weekly_report(os.path.dirname(args.output), "latest_report.md")
    
    logger.info(f"Total Session Runtime: {time.time() - start_time:.2f} seconds")

if __name__ == "__main__":
    main()
