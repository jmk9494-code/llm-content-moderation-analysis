import csv
import re
import os
import gzip
import shutil

INPUT_FILE = "web/public/audit_log.csv"
OUTPUT_FILE = "web/public/audit_log_repaired.csv"
FINAL_GZIP = "web/public/audit_log.csv.gz"
RECENT_FILE = "web/public/audit_recent.csv"

def restore_newlines():
    if not os.path.exists(INPUT_FILE):
        print(f"❌ {INPUT_FILE} not found.")
        return

    print(f"🔧 Restoring newlines in {INPUT_FILE}...")
    
    # Regex for start of a valid row: YYYY-MM-DD, or header "test_date,"
    start_pattern = re.compile(r'^(\d{4}-\d{2}-\d{2}|test_date),')

    with open(INPUT_FILE, 'r', encoding='utf-8', errors='replace') as infile, \
         open(OUTPUT_FILE, 'w', encoding='utf-8', newline='') as outfile:
        
        writer = csv.writer(outfile, quoting=csv.QUOTE_ALL)
        
        buffer_line = None
        
        for line in infile:
            line = line.strip('\r\n') # Remove only trailing newline
            
            if start_pattern.match(line):
                # If we have a buffered line, it's a complete previous row (we assume)
                if buffer_line is not None:
                     # Parse the buffered line as CSV (it might have internal commas from original)
                     # But since it was written without quotas, we have to follow the structure.
                     # However, simply splitting by comma is dangerous if unquoted text has commas.
                     # But we can't do much better without a complex parser.
                     # Wait! If I just print the `buffer_line` to the new file, I'm just reproducing the issue?
                     # NO. I need to QUOTE fields.
                     # I need to parse the `buffer_line` into fields.
                     # Known fields: 16.
                     # If I split by comma, I might get > 16 fields.
                     # Heuristic: split on first X commas, and last Y commas?
                     # Headers: test_date, model, prompt_id, category, style, persona, verdict, classification, prompt_text, response_text, prompt_tokens, completion_tokens, total_tokens, run_cost, confidence, reasoning
                     # 16 columns.
                     # Indices 0-7 are usually safe (simple IDs/dates).
                     # Indices 10-15 are numbers/small strings.
                     # Indices 8 (prompt) and 9 (response) are the problem.
                     
                     process_buffer(writer, buffer_line)
                
                buffer_line = line
            else:
                # Continuation of previous row
                if buffer_line is not None:
                    buffer_line += "\n" + line
                else:
                    # Garbage at start of file?
                    pass
        
        # Flush last line
        if buffer_line:
            process_buffer(writer, buffer_line)

    print(f"✅ Restoration complete.")

    # Compress and Replace
    if os.path.exists(OUTPUT_FILE):
        os.replace(OUTPUT_FILE, INPUT_FILE)
        
        # Update audit_recent.csv too
        shutil.copy(INPUT_FILE, RECENT_FILE)
        
        print(f"📦 Compressing to {FINAL_GZIP}...")
        with open(INPUT_FILE, 'rb') as f_in:
            with gzip.open(FINAL_GZIP, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        print("✅ Compression done.")

def process_buffer(writer, text):
    # Manual split to handle unquoted commas
    parts = text.split(',')
    
    # We expect at least 16 columns.
    # If fewer, just write as is (quoted) - might be broken but at least robust.
    if len(parts) < 16:
        writer.writerow(parts)
        return

    # Strategy: 
    # Keep first 8 fields (Indices 0-7)
    # Identify last 6 fields (Indices -6 to End)? 
    # Actually, reasoning is last. If reasoning has commas, we might split it.
    # But reasoning in this dataset seems to be either quoted (in backup) or empty (in error).
    # Confidence (Index -2) is a float (e.g. 0.0 or 0.9).
    # Cost (Index -3) is a float.
    # Tokens (Indices -4, -5, -6) are Ints.
    
    # Let's try to align from end using the numeric fields.
    # We look for the sequence of [int, int, int, float, float] near the end.
    
    # Find the index of 'run_cost' (float)
    # It should be around len(parts) - 3.
    
    # Fallback: Just merge the middle.
    # 0-7: 8 fields.
    # -6 to end: 6 fields.
    # Middle: Merged into field 8 (prompt). Field 9 (response) set to empty?
    # Actually, let's try to split middle into 2 approx chunks if possible, or just dump all to prompt.
    
    head = parts[:8]
    tail = parts[-6:]
    middle = parts[8:-6]
    
    merged_middle = ",".join(middle)
    
    # Columns expected: 16.
    # head (8) + [merged, ""] + tail (6) = 16.
    # We put everything in prompt, leave response empty.
    
    row = head + [merged_middle, ""] + tail
    writer.writerow(row)

if __name__ == "__main__":
    restore_newlines()
