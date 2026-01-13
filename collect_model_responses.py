import pandas as pd
import openai
import os
import time
import datetime

# --- 1. SCRIPT CONFIGURATION & TIMESTAMPING ---
# Create a timestamp for this run to track changes over time
run_date = datetime.datetime.now().strftime("%Y-%m-%d")

# Load the API key from environment variables (GitHub Secrets)
api_key = os.getenv("OPENROUTER_API_KEY")
if not api_key:
    raise ValueError("API key not found. Make sure the OPENROUTER_API_KEY secret is set.")

# Set up the OpenRouter client
client = openai.OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=api_key,
)

# Your target models
models_to_test = [
    "google/gemini-2.5-flash",
   
]

# --- 2. DATA LOADING ---
try:
    prompts_df = pd.read_csv("data/prompt_library.csv")
except FileNotFoundError:
    print("FATAL ERROR: 'data/prompt_library.csv' not found.")
    exit()

results_list = []
print(f"✅ Setup complete for run: {run_date}. Starting data collection...")

# --- 3. DATA COLLECTION LOOP ---
for model_name in models_to_test:
    print(f"\n--- Testing Model: {model_name} ---")
    for index, row in prompts_df.iterrows():
        prompt_id = row['Prompt_ID']
        prompt_text = row['Prompt_Text']
        category = row['Category']

        print(f"  > Sending Prompt ID: {prompt_id}...")

        try:
            completion = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt_text}],
            )
            response_text = completion.choices[0].message.content
        except Exception as e:
            response_text = f"API_ERROR: {str(e)}"
            print(f"    ❗️ Error for prompt {prompt_id}: {e}")

        # Store results with the new "test_date" column for time tracking
        results_list.append({
            "test_date": run_date,        # CRITICAL for the website history
            "model": model_name,
            "prompt_id": prompt_id,
            "category": category,
            "prompt_text": prompt_text,
            "response_text": response_text
        })

        time.sleep(1) # Be polite to the API

# --- 4. SAVE RESULTS TO HISTORY ---
results_df = pd.DataFrame(results_list)

# Ensure the history directory exists
os.makedirs("data/history", exist_ok=True)

# Save the unique file for this specific date
history_path = f"data/history/results_{run_date}.csv"
results_df.to_csv(history_path, index=False)

# Also save a 'latest' version for easier access if needed
results_df.to_csv("model_responses_automated.csv", index=False)

print(f"SUCCESS: Results saved to {history_path}")
