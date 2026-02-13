import gzip
import shutil
import os
import sys

INPUT_FILE = "web/public/audit_log.csv"
OUTPUT_FILE_FULL = "web/public/audit_log.csv.gz"
OUTPUT_FILE_LITE = "web/public/audit_log_lite.csv.gz"

def compress_csv():
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Input file not found: {INPUT_FILE}")
        return

    print(f"📦 Processing {INPUT_FILE}...")
    
    # 1. Compress Full Version (Metadata + Text)
    print(f"   - Compressing full version to {OUTPUT_FILE_FULL}...")
    with open(INPUT_FILE, 'rb') as f_in:
        with gzip.open(OUTPUT_FILE_FULL, 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)

    # 2. Generate and Compress Lite Version (Metadata Only)
    print(f"   - Generating lite version (no prompt/response) to {OUTPUT_FILE_LITE}...")
    try:
        import pandas as pd
        # Read CSV
        df = pd.read_csv(INPUT_FILE)
        
        # Columns to keep for Lite version (visuals only)
        # We perform a "negative" select to be safer against schema changes, 
        # specifically dropping the heavy text columns.
        drop_cols = ['prompt', 'response', 'prompt_text', 'response_text', 'text', 'prompt_text,response_text']
        
        # Filter columns to only those that exist
        cols_to_drop = [c for c in drop_cols if c in df.columns]
        
        if cols_to_drop:
            print(f"     Dropping columns: {cols_to_drop}")
            df_lite = df.drop(columns=cols_to_drop)
        else:
            print("     ⚠️ No text columns found to drop. Lite version might be same size.")
            df_lite = df
            
        # Save to compressed CSV directly
        df_lite.to_csv(OUTPUT_FILE_LITE, index=False, compression='gzip')
        
    except ImportError:
        print("❌ Pandas not found. Cannot generate lite version. Skipping.")
        return
    except Exception as e:
        print(f"❌ Failed to generate lite version: {e}")
        return

    # Stats
    original_size = os.path.getsize(INPUT_FILE) / (1024 * 1024)
    full_size = os.path.getsize(OUTPUT_FILE_FULL) / (1024 * 1024)
    lite_size = os.path.getsize(OUTPUT_FILE_LITE) / (1024 * 1024)
    reduction = (1 - (lite_size / full_size)) * 100
    
    print(f"\n📊 Stats:")
    print(f"   Original: {original_size:.2f} MB")
    print(f"   Full GZ:  {full_size:.2f} MB")
    print(f"   Lite GZ:  {lite_size:.2f} MB ({reduction:.1f}% smaller than Full GZ)")
    print(f"✅ Saved to: {OUTPUT_FILE_FULL} and {OUTPUT_FILE_LITE}")

if __name__ == "__main__":
    compress_csv()
