import csv
import re
import os
import gzip
import shutil

INPUT_FILE = "web/public/audit_log.csv"
OUTPUT_FILE = "web/public/audit_log_clean.csv"
FINAL_GZIP = "web/public/audit_log.csv.gz"

def fix_csv():
    if not os.path.exists(INPUT_FILE):
        print(f"❌ {INPUT_FILE} not found.")
        return

    print(f"🔧 Repairing {INPUT_FILE}...")
    
    valid_rows = 0
    dropped_rows = 0
    
    # Model regex: usually "provider/model-name"
    model_pattern = re.compile(r'^[a-zA-Z0-9-]+/[a-zA-Z0-9:.-]+$')

    with open(INPUT_FILE, 'r', encoding='utf-8', errors='replace') as infile, \
         open(OUTPUT_FILE, 'w', encoding='utf-8', newline='') as outfile:
        
        reader = csv.reader(infile)
        writer = csv.writer(outfile, quoting=csv.QUOTE_MINIMAL)
        
        try:
            headers = next(reader)
            writer.writerow(headers)
        except StopIteration:
            print("❌ Empty file")
            return

        for i, row in enumerate(reader):
            # Heuristic 1: Check column count
            # Headers length is 16.
            if len(row) < 2:
                dropped_rows += 1
                continue

            # Heuristic 2: Check 'model' (index 1)
            model = row[1].strip()
            
            # If model is numeric (e.g. "63"), drop it
            if model.isdigit() or len(model) < 3 or not model_pattern.match(model):
                 # Try to rescue? Maybe columns shifted?
                 # If we can't easily rescue, drop.
                 # print(f"Dropping bad model row {i}: {model}")
                 dropped_rows += 1
                 continue
            
            # Heuristic 3: Check date (index 0)
            # Should be YYYY-MM-DD
            if not re.match(r'^\d{4}-\d{2}-\d{2}', row[0]):
                dropped_rows += 1
                continue

            writer.writerow(row)
            valid_rows += 1

    print(f"✅ Repair complete.")
    print(f"   Valid rows: {valid_rows}")
    print(f"   Dropped rows: {dropped_rows}")

    # Replace original and compress
    os.replace(OUTPUT_FILE, INPUT_FILE)
    
    print(f"📦 Compressing to {FINAL_GZIP}...")
    with open(INPUT_FILE, 'rb') as f_in:
        with gzip.open(FINAL_GZIP, 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)
    print("✅ Compression done.")

if __name__ == "__main__":
    fix_csv()
