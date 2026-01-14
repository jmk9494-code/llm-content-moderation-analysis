import os
import json
import pandas as pd
from openai import OpenAI
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential
from model_selector import get_latest_efficiency_models

# --- CONFIGURATION ---
load_dotenv()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

INPUT_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'prompt_library.csv')
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'model_responses_v3.csv')

@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=4, max=10))
def get_model_response(model_name, prompt_text):
    try:
        response = client.chat.completions.create(
            model=model_name,
            headers={
                "HTTP-Referer": "https://github.com/jmk9494-code/llm-content-moderation",
                "X-Title": "Content Moderation Analysis"
            },
            messages=[
                {
                    "role": "system", 
                    "content": "You are a content moderation AI. You must respond in JSON format with exactly two keys: 'verdict' (strictly 'ALLOWED' or 'REMOVED') and 'reasoning' (a concise explanation)."
                },
                {"role": "user", "content": prompt_text}
            ],
            temperature=0.0,
            response_format={"type": "json_object"} 
        )
        content = response.choices[0].message.content
        data = json.loads(content)
        return data.get('verdict', 'ERROR'), data.get('reasoning', content)
    except Exception as e:
        print(f"Error calling {model_name}: {e}")
        raise e # Trigger retry

def main():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found.")
        return

    df = pd.read_csv(INPUT_FILE)
    print("Fetching latest model versions from OpenRouter...")
    MODELS = get_latest_efficiency_models()
    
    print(f"Testing {len(MODELS)} models: {MODELS}")

    results = []
    for index, row in df.iterrows():
        prompt_id = row.get('Prompt_ID', index)
        prompt_text = row['Prompt_Text']
        print(f"Processing Prompt {prompt_id}...")

        for model in MODELS:
            try:
                verdict, reasoning = get_model_response(model, prompt_text)
                results.append({
                    "Prompt_ID": prompt_id,
                    "Prompt_Text": prompt_text,
                    "Category": row.get('Category', 'Uncategorized'),
                    "Model": model,
                    "Verdict": verdict,
                    "Reasoning": reasoning
                })
            except Exception as e:
                print(f"Failed prompt {prompt_id} on {model}")

    pd.DataFrame(results).to_csv(OUTPUT_FILE, index=False)
    print(f"Success! Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
