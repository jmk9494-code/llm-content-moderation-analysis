import os
import requests
from dotenv import load_dotenv

load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

def get_latest_efficiency_models():
    print("🔎 Auto-Discovering latest efficiency models...")
    url = "https://openrouter.ai/api/v1/models"
    headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}"}
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        all_models = response.json()['data']
    except Exception:
        # Fallback defaults
        return ["openai/gpt-4o-mini", "google/gemini-flash-1.5", "anthropic/claude-3.5-haiku", "meta-llama/llama-3.3-70b-instruct", "x-ai/grok-2-1212"]

    family_rules = {
        "OpenAI":   {"search": "openai/",      "must_contain": ["gpt", "mini"]},
        "Google":   {"search": "google/",      "must_contain": ["gemini", "flash"]},
        "Claude":   {"search": "anthropic/",   "must_contain": ["claude", "haiku"]},
        "Llama":    {"search": "meta-llama/",  "must_contain": ["llama", "70b", "instruct"]}, 
        "Grok":     {"search": "x-ai/",        "must_contain": ["grok"]}
    }

    selected_ids = []
    for family, rules in family_rules.items():
        candidates = [m for m in all_models if rules["search"] in m['id'] and all(tag in m['id'].lower() for tag in rules["must_contain"]) and "free" not in m['id']]
        
        if "Grok" in family:
            fast = [c for c in candidates if "fast" in c['id'].lower()]
            if fast: candidates = fast

        if candidates:
            candidates.sort(key=lambda x: x.get('created', 0), reverse=True)
            selected_ids.append(candidates[0]['id'])
            print(f"   ✅ {family}: Found {candidates[0]['id']}")

    return selected_ids

if __name__ == "__main__":
    print(get_latest_efficiency_models())
