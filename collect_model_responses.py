# Filename: collect_model_responses.py

import pandas as pd
import openai
import os
import time

# --- SCRIPT CONFIGURATION ---

# 1. Load the API key from the environment variable (provided by GitHub Secrets)
api_key = os.getenv("OPENROUTER_API_KEY")
if not api_key:
    raise ValueError("API key not found. Make sure the OPENROUTER_API_KEY secret is set in your GitHub repository.")

# 2. Set up the client to communicate with the OpenRouter API
client = openai.OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=api_key,
)

# 3. Define the list of models you want to test
# Get the exact model names from OpenRouter's documentation.
models_to_test = [
    "google/gemini-pro",
    "openai/gpt-4-turbo",
    "anthropic/claude-3-haiku",
    "meta-llama/llama-3-8b-instruct",
    "mistralai/mistral-7b-instruct",
]

# --- DATA COLLECTION ---

# 4. Load your prompts from the CSV file located in the 'data' folder
try:
    prompts_df = pd.read_csv("data/prompt_library.csv")
except FileNotFoundError:
    print("FATAL ERROR: 'data/prompt_library.csv' not found. Make sure the file exists in the 'data' directory.")
    exit() # Stop the script if the prompt file isn't found

# 5. Prepare a list to store all the results
results_list = []

print("✅ Setup complete. Starting data collection...")

# 6. Loop through each model and each prompt
for model_name in models_to_test:
    print(f"\n--- Testing Model: {model_name} ---")
    for index, row in prompts_df.iterrows():
        prompt_id = row['Prompt_ID']
        prompt_text = row['Prompt_Text']

        print(f"  > Sending Prompt ID: {prompt_id}...")

        try:
            # This is the API call to get the model's judgment
            completion = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "user", "content": prompt_text},
                ],
            )
            response_text = completion.choices[0].message.content

        except Exception as e:
            response_text = f"API_ERROR: {str(e)}"
            print(f"    ❗️ Error for prompt {prompt_id}: {e}")

        # Store the result in a dictionary
        result = {
            "Timestamp": pd.Timestamp.now(),
            "Model": model_name,
            "Prompt_ID": row['Prompt_ID'],
            "Prompt_Category": row['Category'],
            "Prompt_Text": prompt_text,
            "Response_Text": response_text,
        }
        results_list.append(result)

        # Wait a second between API calls to be polite to the API
        time.sleep(1)

print("\n--- ✅ Data collection complete! ---")

# --- SAVE RESULTS ---
# 7. Convert the list of results into a DataFrame and save it as a new CSV
results_df = pd.DataFrame(results_list)
results_df.to_csv("model_responses_automated.csv", index=False)

print("SUCCESS: Results saved to 'model_responses_automated.csv'.")
