import requests
import json

def list_google_models():
    try:
        response = requests.get("https://openrouter.ai/api/v1/models")
        response.raise_for_status()
        data = response.json()["data"]
        
        print("Found Google Models:")
        for m in data:
            if "google" in m["id"] or "gemini" in m["id"]:
                print(f"- {m['id']} (Pricing: {m.get('pricing', {})})")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_google_models()
