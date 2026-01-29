import json
import os
import re

def convert_csv_to_json():
    csv_path = 'web/public/audit_log.csv'
    json_path = 'web/public/assets/traces.json'
    
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found.")
        return

    print(f"Reading {csv_path}...")
    
    records = []
    
    try:
        with open(csv_path, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()
            
        current_record_lines = []
        is_first = True
        
        # Regex to detect start of a new record (YYYY-MM-DD)
        date_pattern = re.compile(r'^\d{4}-\d{2}-\d{2},')
        
        for line in lines:
            # Skip header
            if is_first:
                is_first = False
                continue
                
            if date_pattern.match(line):
                # Process previous record if it exists
                if current_record_lines:
                    record_text = "".join(current_record_lines).strip()
                    row = parse_record_manual(record_text)
                    if row:
                        records.append(row)
                current_record_lines = [line]
            else:
                current_record_lines.append(line)
        
        # Process last record
        if current_record_lines:
            record_text = "".join(current_record_lines).strip()
            row = parse_record_manual(record_text)
            if row:
                records.append(row)
                
        # Write to JSON
        os.makedirs(os.path.dirname(json_path), exist_ok=True)
        
        print(f"Writing {len(records)} records to {json_path}")
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(records, f, indent=None) # Compact JSON
            
        print(f"✅ Successfully converted to {json_path}")
        
    except Exception as e:
        print(f"Failed to convert: {e}")
        import traceback
        traceback.print_exc()

def parse_record_manual(text):
    """
    Parses a single record string (which might span multiple lines) handling messy CSV middle.
    Fields expected: Date, Model, ID, Category, Verdict, Prompt, Response, Tokens, ComplTokens, TotalTokens, Cost
    """
    try:
        # 1. Extract first 5 fields: Date, Model, ID, Category, Verdict
        # These are simple comma-separated values at the start
        parts = text.split(',', 5)
        if len(parts) < 6:
            return None
            
        timestamp = parts[0]
        model = parts[1]
        case_id = parts[2]
        category = parts[3]
        verdict = parts[4]
        rest = parts[5]
        
        # 2. Extract last 4 numeric fields: PromptTokens, ComplTokens, TotalTokens, Cost
        # We split from the right
        right_parts = rest.rsplit(',', 4)
        if len(right_parts) < 5:
            # Maybe fewer fields? Fallback
             return None
             
        middle_chunk = right_parts[0]
        # cost = right_parts[4] (last one)
        # tokens = right_parts[3] (total tokens)
        
        try:
             tokens_used = int(right_parts[3])
        except:
             tokens_used = 0
             
        try:
             cost = float(right_parts[4])
        except:
             cost = 0
             
        # 3. Middle chunk is Prompt + Response
        # Response usually starts with a quoted JSON object "{" or just {
        # And Prompt ends before that.
        # Since response is often quoted in the CSV "...", we look for ," as delimiter?
        # Or just the last ,"{ or ,{
        
        # Heuristic: Find split point
        # Look for the start of the JSON response block
        # It usually looks like `,"{` or `,"{` preceded by newline?
        # Actually in the CSV format: ...,Prompt,"ResponseJson",...
        # So we look for the LAST instance of `,"{` or just `"{` if there is no comma?
        # Wait, comma is the delimiter. So `,"{`.
        
        split_idx = middle_chunk.rfind(',"{')
        if split_idx == -1:
             split_idx = middle_chunk.rfind(',{') # In case unquoted
             
        if split_idx != -1:
            prompt_raw = middle_chunk[:split_idx]
            response_raw = middle_chunk[split_idx+1:] # Include the comma? No, remove comma
            # response_raw starts with "{ or {
        else:
            # Fallback: assuming only prompt?
            prompt_raw = middle_chunk
            response_raw = ""

        # Clean up quotes
        # Prompt might be quoted "..." or unquoted
        prompt = clean_csv_field(prompt_raw)
        response = clean_csv_field(response_raw)
        
        return {
            "timestamp": timestamp,
            "model": model,
            "case_id": case_id,
            "category": category,
            "verdict": verdict,
            "prompt_text": prompt,
            "response_text": response,
            "tokens_used": tokens_used,
            "cost": cost
        }
        
    except Exception as e:
        # print(f"Skipping bad row: {e}")
        return None

def clean_csv_field(text):
    if not text: return ""
    # Use simple heuristic for CSV unescaping
    # If starts and ends with ", remove them and replace "" with "
    if text.startswith('"') and text.endswith('"') and len(text) >= 2:
        text = text[1:-1]
        text = text.replace('""', '"')
    return text

if __name__ == "__main__":
    convert_csv_to_json()
