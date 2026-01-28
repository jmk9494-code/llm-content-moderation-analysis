
import os
import sys
import json
import logging
import pandas as pd
from huggingface_hub import HfApi, login
from datasets import Dataset

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Constants
TRACES_PATH = "web/public/assets/traces.json"
REPO_ID = os.getenv("HF_REPO_ID", "jkandel/moderation-bias-benchmark")  # Default or Env Var
HF_TOKEN = os.getenv("HF_TOKEN")

def sync_to_huggingface():
    """
    Syncs the local traces.json to Hugging Face Hub as a Dataset.
    """
    if not HF_TOKEN:
        logger.error("❌ HF_TOKEN environment variable is not set. Skipping sync.")
        sys.exit(1)
        
    if not os.path.exists(TRACES_PATH):
        logger.error(f"❌ Traces file not found at {TRACES_PATH}")
        sys.exit(1)

    logger.info("🔐 Logging in to Hugging Face...")
    try:
        login(token=HF_TOKEN, add_to_git_credential=False)
    except Exception as e:
        logger.error(f"❌ Login failed: {e}")
        sys.exit(1)

    logger.info(f"📂 Loading data from {TRACES_PATH}...")
    try:
        # Load JSON
        with open(TRACES_PATH, 'r') as f:
            data = json.load(f)
        
        # Convert to specific format if needed, or direct to DataFrame
        # Assuming data is a list of dicts. If it's the full audit log structure, it works directly.
        df = pd.DataFrame(data)
        
        # Create HF Dataset
        dataset = Dataset.from_pandas(df)
        
        logger.info(f"🚀 Pushing dataset to {REPO_ID}...")
        dataset.push_to_hub(REPO_ID)
        
        logger.info("✅ formatted and pushed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Failed to process or push dataset: {e}")
        sys.exit(1)

if __name__ == "__main__":
    sync_to_huggingface()
