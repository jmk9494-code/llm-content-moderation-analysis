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

    logger.addHandler(c_handler)
    logger.addHandler(f_handler)
    
    return logger

# Singleton instance
logger = setup_logger()
