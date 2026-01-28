import csv
import json
import base64
import os
import io

def load_prompts(file_path, limit=None):
    """
    Loads prompts from CSV or B64 encoded JSON/CSV.
    Auto-detects .b64 extension to decoding.
    """
    prompts = []
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return []

    # Determine format: JSON or CSV
    is_json = file_path.endswith('.json')
    
    # If decoding from b64, check content to guess format
    content_str = ""
    if file_path.endswith('.b64'):
        print(f"🔓 Decrypting sensitive data from {file_path}...")
        with open(file_path, 'r', encoding='utf-8') as f:
            encoded_data = f.read()
            decoded_bytes = base64.b64decode(encoded_data)
            content_str = decoded_bytes.decode('utf-8')
            
        # heuristic check for JSON
        if content_str.strip().startswith('['):
            is_json = True
    else:
        with open(file_path, mode='r', encoding='utf-8') as f:
            content_str = f.read()
            
    if is_json:
        try:
            data = json.loads(content_str)
            for item in data:
                 p_id = item.get('id') or item.get('Prompt_ID')
                 cat = item.get('category') or item.get('Category')
                 text = item.get('text') or item.get('Prompt_Text')
                 
                 if p_id and text:
                     prompts.append({'id': p_id, 'category': cat, 'text': text})
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON: {e}")
            return []
    else:
        # Assume CSV
        f_handle = io.StringIO(content_str)
        try:
            reader = csv.DictReader(f_handle)
            for i, row in enumerate(reader):
                if limit and i >= limit:
                    break
                p_id = row.get('Prompt_ID') or row.get('id')
                cat = row.get('Category') or row.get('category')
                text = row.get('Prompt_Text') or row.get('text')
                
                if p_id and text:
                    prompts.append({'id': p_id, 'category': cat, 'text': text})
        except Exception as e:
            print(f"Error reading CSV prompts: {e}")
        finally:
            f_handle.close()

    return prompts
