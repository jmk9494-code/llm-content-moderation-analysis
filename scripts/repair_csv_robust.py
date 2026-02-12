import csv
import sys
import gzip
import shutil
import os

INPUT_FILE = 'web/public/audit_recent.csv'
OUTPUT_FILE = 'web/public/audit_log.csv'
GZ_FILE = 'web/public/audit_log.csv.gz'

def repair_csv():
    print(f"Reading from {INPUT_FILE}...")
    
    # Increase field size limit for large prompts
    csv.field_size_limit(sys.maxsize)
    
    rows = []
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8', errors='replace') as f:
            reader = csv.reader(f)
            header = next(reader)
            print(f"Header: {header}")
            rows.append(header)
            
            count = 0
            for row in reader:
                # Basic validation: check column count
                # Header has 16 cols. 
                # If row has different count, try to handle it?
                # But let's just write valid rows for now.
                if len(row) != len(header):
                    # print(f"Warning: Row {count+2} has {len(row)} columns (expected {len(header)})")
                    pass
                
                rows.append(row)
                count += 1
                if count % 1000 == 0:
                    print(f"Processed {count} rows...", end='\r')
            
            print(f"\nTotal rows read: {count}")
            
    except Exception as e:
        print(f"Error reading CSV: {e}")
        # If error occurs, we might want to salvage what we have? 
        return

    print(f"Writing {len(rows)} rows to {OUTPUT_FILE} with full quoting...")
    
    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f, quoting=csv.QUOTE_ALL)
            writer.writerows(rows)
            
        print(f"Successfully wrote {OUTPUT_FILE}")
        
        # Compress
        print(f"Compressing to {GZ_FILE}...")
        with open(OUTPUT_FILE, 'rb') as f_in:
            with gzip.open(GZ_FILE, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        
        print(f"Done! Created {GZ_FILE}")
        
    except Exception as e:
        print(f"Error writing CSV: {e}")

if __name__ == "__main__":
    repair_csv()
