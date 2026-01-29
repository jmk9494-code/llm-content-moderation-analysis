import gzip
import shutil
import os
import sys

INPUT_FILE = "web/public/audit_log.csv"
OUTPUT_FILE = "web/public/audit_log.csv.gz"

def compress_csv():
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Input file not found: {INPUT_FILE}")
        return

    print(f"📦 Compressing {INPUT_FILE}...")
    
    # Compress
    with open(INPUT_FILE, 'rb') as f_in:
        with gzip.open(OUTPUT_FILE, 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)
            
    # Stats
    original_size = os.path.getsize(INPUT_FILE) / (1024 * 1024)
    compressed_size = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
    reduction = (1 - (compressed_size / original_size)) * 100
    
    print(f"✅ Squeezed: {original_size:.2f}MB -> {compressed_size:.2f}MB ({reduction:.1f}% reduction)")
    print(f"✅ Saved to: {OUTPUT_FILE}")

if __name__ == "__main__":
    compress_csv()
