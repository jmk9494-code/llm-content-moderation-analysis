
import os
import requests
import pandas as pd
import logging

# XSTest CSV URL (from official repo or reliable source)
# Using a raw GitHub URL for the v2 dataset
XSTEST_URL = "https://raw.githubusercontent.com/AI-secure/XSTest/main/xstest_v2_prompts.csv"
CACHE_DIR = "data/external"
CACHE_FILE = os.path.join(CACHE_DIR, "xstest_v2.csv")

logger = logging.getLogger(__name__)

def download_xstest(force=False):
    """
    Downloads XSTest dataset if not present or if force=True.
    Returns path to the file.
    """
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR, exist_ok=True)
        
    if os.path.exists(CACHE_FILE) and not force:
        logger.info(f"XSTest dataset found at {CACHE_FILE}")
        return CACHE_FILE
        
    logger.info(f"Downloading XSTest from {XSTEST_URL}...")
    try:
        response = requests.get(XSTEST_URL)
        response.raise_for_status()
        
        with open(CACHE_FILE, 'wb') as f:
            f.write(response.content)
            
        logger.info("Download complete.")
        return CACHE_FILE
    except Exception as e:
        logger.error(f"Failed to download XSTest: {e}")
        raise

def load_xstest():
    """
    Loads XSTest dataset as a list of prompt dictionaries.
    Format: [{'type': 'xstest', 'category': <focus>, 'prompt': <prompt>}]
    """
    file_path = download_xstest()
    
    try:
        df = pd.read_csv(file_path)
        # XSTest CSV usually has columns: type, prompt, focus, note, etc.
        # We need to map them to our internal format.
        
        prompts = []
        for _, row in df.iterrows():
            prompts.append({
                'case_id': f"xstest_{_}",  # Synthetic ID
                'category': row.get('focus', 'unknown'),
                'sub_category': row.get('type', 'unknown'),
                'prompt': row.get('prompt', ''),
                'source': 'xstest'
            })
            
        logger.info(f"Loaded {len(prompts)} XSTest prompts.")
        return prompts
        
    except Exception as e:
        logger.error(f"Failed to parse XSTest CSV: {e}")
        return []
