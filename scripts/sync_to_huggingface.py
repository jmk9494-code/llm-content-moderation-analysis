
import os
import sys
import logging
import pandas as pd
from huggingface_hub import login
from datasets import Dataset

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Constants
CSV_PATH = "web/public/audit_log.csv"
REPO_ID = os.getenv("HF_REPO_ID", "jkandel/moderation-bias-benchmark") 
HF_TOKEN = os.getenv("HF_TOKEN")

def sync_to_huggingface():
    """
    Syncs the main audit log to Hugging Face Hub as a consolidated Dataset (Parquet).
    """
    if not HF_TOKEN:
        logger.error("❌ HF_TOKEN environment variable is not set. Skipping sync.")
        sys.exit(1)
        
    if not os.path.exists(CSV_PATH):
        logger.error(f"❌ Audit Log not found at {CSV_PATH}")
        sys.exit(1)

    logger.info("🔐 Logging in to Hugging Face...")
    try:
        login(token=HF_TOKEN, add_to_git_credential=False)
    except Exception as e:
        logger.error(f"❌ Login failed: {e}")
        sys.exit(1)

    logger.info(f"📂 Loading data from {CSV_PATH}...")
    try:
        # Load CSV
        # Use low_memory=False to avoid mixed type warnings on large files
        df = pd.read_csv(CSV_PATH, low_memory=False)
        logger.info(f"Loaded {len(df)} rows.")
        
        # Create HF Dataset
        # This converts to Arrow/Parquet under the hood which compresses efficiently
        dataset = Dataset.from_pandas(df)
        
        logger.info(f"🚀 Pushing dataset to {REPO_ID} (Parquet)...")
        # private=False creates public dataset if not exists
        dataset.push_to_hub(REPO_ID, private=False)
        
        logger.info("✅ Dataset synced successfully!")
        
    except Exception as e:
        logger.error(f"❌ Failed to push dataset: {e}")
        sys.exit(1)

if __name__ == "__main__":
    sync_to_huggingface()
