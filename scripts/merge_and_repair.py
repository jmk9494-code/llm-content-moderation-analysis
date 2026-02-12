import csv
import sys
import gzip
import shutil
import os

# Source Files
FILES = [
    {'path': 'web/public/audit_log.bak', 'type': 'bak'},      # 71k records (Older, 11 cols)
    {'path': 'web/public/audit_recent.csv', 'type': 'recent'} # 12k records (Newer, 16 cols)
]

OUTPUT_FILE = 'web/public/audit_log.csv'
GZ_FILE = 'web/public/audit_log.csv.gz'

# Target Header (Union of all known columns)
TARGET_HEADER = [
    'test_date', 'model', 'prompt_id', 'category', 'style', 'persona', 
    'verdict', 'classification', 'prompt_text', 'response_text', 
    'prompt_tokens', 'completion_tokens', 'total_tokens', 'run_cost', 
    'confidence', 'reasoning'
]

def merge_csvs():
    print("Starting merge process...")
    csv.field_size_limit(sys.maxsize)
    
    merged_rows = []
    
    for entry in FILES:
        fpath = entry['path']
        print(f"Processing {fpath}...")
        
        try:
            with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
                reader = csv.reader(f)
                header = next(reader)
                
                # Normalize header (remove BOM, quotes)
                header = [h.replace('"', '').replace("'", '').strip() for h in header]
                print(f"  Header ({len(header)} cols): {header}")
                
                # Map source columns to target indices
                col_map = {}
                for tgt_col in TARGET_HEADER:
                    # Try exact match
                    if tgt_col in header:
                        col_map[tgt_col] = header.index(tgt_col)
                    # Try aliases
                    elif tgt_col == 'test_date' and 'timestamp' in header:
                        col_map[tgt_col] = header.index('timestamp')
                    elif tgt_col == 'prompt_id' and 'case_id' in header:
                        col_map[tgt_col] = header.index('case_id')
                    else:
                        col_map[tgt_col] = -1 # Missing
                
                # Read rows
                count = 0
                for row in reader:
                    new_row = []
                    for tgt_col in TARGET_HEADER:
                        src_idx = col_map.get(tgt_col, -1)
                        if src_idx >= 0 and src_idx < len(row):
                            new_row.append(row[src_idx])
                        else:
                            new_row.append('') # Fill missing
                    
                    merged_rows.append(new_row)
                    count += 1
                
                print(f"  Read {count} records.")
                
        except Exception as e:
            print(f"  Error processing {fpath}: {e}")

    print(f"Total merged records: {len(merged_rows)}")
    
    # Write Output
    print(f"Writing to {OUTPUT_FILE}...")
    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f, quoting=csv.QUOTE_ALL)
            writer.writerow(TARGET_HEADER)
            writer.writerows(merged_rows)
            
        # Compress
        print(f"Compressing to {GZ_FILE}...")
        with open(OUTPUT_FILE, 'rb') as f_in:
            with gzip.open(GZ_FILE, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
                
        print("Success!")
        
    except Exception as e:
        print(f"Error writing output: {e}")

if __name__ == "__main__":
    merge_csvs()
