import os
import json
import pandas as pd
from openai import OpenAI
import google.generativeai as genai
from dotenv import load_dotenv

# --- CONFIGURATION ---
load_dotenv()  # Load API keys from .env file

# API KEYS (Ensure these are set in your environment or .env file)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# FILE PATHS
INPUT_PROMPTS_FILE = 'data/prompt_library.csv'  # Adjust if your input file has a different name
OUTPUT_FILE = 'data/model_responses_v2.csv'

# Configure Clients
if OPENAI_API_KEY:
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# --- HELPER FUNCTIONS ---

def get_openai_response(model_name, prompt_text):
    """
    Fetches response from OpenAI models using JSON mode for reliable parsing.
    """
    try:
        response = openai_client.chat.completions.create(
            model=model_name,
            messages=[
                {
                    "role": "system", 
                    "content": "You are a content moderation AI. You must respond in JSON format with exactly two keys: 'verdict' (strictly 'ALLOWED' or 'REMOVED') and 'reasoning' (a concise explanation)."
                },
                {"role": "user", "content": prompt_text}
            ],
            temperature=0.0,
            response_format={"type": "json_object"} # <--- FORCES JSON OUTPUT
        )
        
        # Parse the JSON response
        content = response.choices[0].message.content
        data = json.loads(content)
        return data.get('verdict', 'ERROR'), data.get('reasoning', content)
        
    except Exception as e:
        print(f"Error calling OpenAI {model_name}: {e}")
        return "ERROR", str(e)

def get_gemini_response(model_name, prompt_text):
    """
    Fetches response from Google Gemini models using response_schema for reliable parsing.
    """
    try:
        # Instantiate the model
        model = genai.GenerativeModel(model_name)
        
        response = model.generate_content(
            prompt_text,
            generation_config={
                "response_mime_type": "application/json", # <--- FORCES JSON OUTPUT
                "response_schema": {
                    "type": "OBJECT",
                    "properties": {
                        "verdict": {"type": "STRING", "enum": ["ALLOWED", "REMOVED"]},
                        "reasoning": {"type": "STRING"}
                    }
                }
            }
        )
        
        # Parse the JSON response
        data = json.loads(response.text)
        return data.get('verdict', 'ERROR'), data.get('reasoning', response.text)
        
    except Exception as e:
        print(f"Error calling Gemini {model_name}: {e}")
        return "ERROR", str(e)

# --- MAIN EXECUTION ---

def main():
    # 1. Load Prompts
    if not os.path.exists(INPUT_PROMPTS_FILE):
        print(f"Error: Input file {INPUT_PROMPTS_FILE} not found.")
        return

    df = pd.read_csv(INPUT_PROMPTS_FILE)
    print(f"Loaded {len(df)} prompts from {INPUT_PROMPTS_FILE}")

    # 2. Define Models to Test
    models_to_test = [
        "gpt-4o-mini",
        # "gpt-4-turbo",       # Uncomment to test more
        "gemini-1.5-flash",
        # "gemini-1.5-pro",    # Uncomment to test more
    ]

    results = []

    # 3. Loop Through Prompts and Models
    for index, row in df.iterrows():
        prompt_id = row.get('Prompt_ID', index)
        prompt_text = row['Prompt_Text'] # Ensure your CSV has a column named 'Prompt_Text'
        
        print(f"Processing Prompt {prompt_id}...")

        for model in models_to_test:
            verdict = "SKIPPED"
            reasoning = ""

            # Route to correct API handler
            if "gpt" in model:
                verdict, reasoning = get_openai_response(model, prompt_text)
            elif "gemini" in model:
                verdict, reasoning = get_gemini_response(model, prompt_text)
            
            # Append result
            results.append({
                "Prompt_ID": prompt_id,
                "Prompt_Text": prompt_text,
                "Model": model,
                "Verdict": verdict,    # Now clean: 'ALLOWED' or 'REMOVED'
                "Reasoning": reasoning # Now clean: Just the explanation
            })

    # 4. Save Results
    results_df = pd.DataFrame(results)
    results_df.to_csv(OUTPUT_FILE, index=False)
    print(f"\nSuccess! Responses saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
