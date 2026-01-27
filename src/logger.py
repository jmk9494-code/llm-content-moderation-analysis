import logging
import sys
from logging.handlers import RotatingFileHandler
import os

def setup_logger(name="audit_logger", log_file="app.log"):
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG) 
    
    # Avoid duplicate logs if re-initialized
    if logger.handlers:
        return logger

    # 1. Console Handler (INFO+)
    c_handler = logging.StreamHandler(sys.stdout)
    c_handler.setLevel(logging.INFO)
    c_format = logging.Formatter('%(levelname)s: %(message)s')
    c_handler.setFormatter(c_format)

    # 2. File Handler (DEBUG+) with Rotation
    # Max size 5MB, keep 3 backup files
    f_handler = RotatingFileHandler(log_file, maxBytes=5*1024*1024, backupCount=3)
    f_handler.setLevel(logging.DEBUG)
    f_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    f_handler.setFormatter(f_format)


    logger.addHandler(f_handler)
    
    return logger

def log_raw_trace(run_id, model, prompt, response_text, full_payload=None):
    """
    Saves raw trace artifact for reproducibility.
    """
    try:
        trace_dir = "data/raw_traces"
        os.makedirs(trace_dir, exist_ok=True)
        
        filename = f"{trace_dir}/{run_id}.json"
        
        import json
        data = {
            "run_id": run_id,
            "timestamp": "TODO", # Ideally passed in or generated
            "model": model,
            "prompt": prompt,
            "response": response_text,
            "full_payload": full_payload or {}
        }
        
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
            
    except Exception as e:
        print(f"Failed to log raw trace: {e}")

# Singleton instance
logger = setup_logger()
