import pandas as pd
import argparse
import os
import json
import re
from collections import Counter
from src.logger import logger

# Stop words list (extended from page.tsx)
STOP_WORDS = {
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'this', 'that', 'it', 'i', 'you', 'he', 'she', 'they', 'we', 'me', 'him', 'her', 'them', 'us', 'my', 'your', 'his', 'her', 'their', 'our', 'what', 'which', 'who', 'whom', 'whose', 'why', 'how', 'where', 'when', 'can', 'could', 'should', 'would', 'will', 'may', 'might', 'must', 'do', 'does', 'did', 'done', 'doing', 'have', 'has', 'had', 'having', 'not', 'no', 'yes', 'if', 'then', 'else', 'from', 'as', 'so', 'than', 'just', 'very', 'really', 'too', 'much', 'many', 'more', 'most', 'some', 'any', 'all', 'none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'make', 'write', 'create', 'generate', 'tell', 'me', 'about', 'like', 'know'
}

def extract_triggers(input_file, output_file):
    if not os.path.exists(input_file):
        logger.error(f"Input file {input_file} not found")
        return

    try:
        logger.info(f"READing {input_file}...")
        df = pd.read_csv(input_file, on_bad_lines='skip', engine='python')
        
        # Filter refusals
        if 'verdict' not in df.columns:
             logger.error("No 'verdict' column found")
             return

        refusals = df[df['verdict'].isin(['REFUSAL', 'REMOVED', 'unsafe', 'Hard Refusal'])]
        logger.info(f"Found {len(refusals)} refusals out of {len(df)} rows")
        
        word_counts = Counter()
        
        # Process prompts
        # Handle NaN prompts
        prompt_col = 'prompt' if 'prompt' in df.columns else 'prompt_text'
        if prompt_col not in df.columns:
            logger.error(f"Neither 'prompt' nor 'prompt_text' column found. Columns: {df.columns.tolist()}")
            return

        prompts = refusals[prompt_col].dropna().astype(str)
        
        for prompt in prompts:
            # Clean and tokenize
            # Simple regex: remove non-alphanumeric (keep spaces), lowercase
            clean = re.sub(r'[^\w\s]', '', prompt.lower())
            words = clean.split()
            
            for w in words:
                if len(w) > 3 and w not in STOP_WORDS:
                    word_counts[w] += 1
        
        # Top 30
        top_words = [{'word': w, 'count': c} for w, c in word_counts.most_common(30)]
        
        # Save
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, 'w') as f:
            json.dump(top_words, f, indent=2)
            
        logger.info(f"✅ Trigger words saved to {output_file}")
        
    except Exception as e:
        print(f"❌ Failed to extract triggers: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 Starting trigger extraction...")
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="web/public/audit_log.csv.gz")
    parser.add_argument("--output", default="web/public/assets/trigger_words.json")
    args = parser.parse_args()
    
    print(f"📂 Input: {args.input}")
    print(f"📂 Output: {args.output}")
    extract_triggers(args.input, args.output)
