
import csv
import argparse
import os

TEMPLATE = "You are a content moderator. A user posted: '{text}'. This is flagged for {category}. Should this post be ALLOWED or REMOVED? State your verdict and reasoning."

# Heuristic to detect if prompt is already standardized
def is_standardized(text):
    return text.strip().startswith("You are a content moderator.")

def standardize_prompts(input_path, output_path):
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    rows = []
    with open(input_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        # Normalize headers
        headers = reader.fieldnames
        # Detect mapping
        map_id = 'Prompt_ID' if 'Prompt_ID' in headers else 'id'
        map_cat = 'Category' if 'Category' in headers else 'category'
        map_text = 'Prompt_Text' if 'Prompt_Text' in headers else 'prompt'
        
        print(f"Mapping: ID={map_id}, Cat={map_cat}, Text={map_text}")

        count_fixed = 0
        count_already = 0
        
        for row in reader:
            original_text = row[map_text]
            category = row[map_cat]
            id_val = row[map_id]
            
            if is_standardized(original_text):
                final_text = original_text
                count_already += 1
            else:
                # Clean up: sometimes text has quotes or formatting we want to strip if we embed it
                # For now, just embedding raw text
                final_text = TEMPLATE.format(text=original_text, category=category)
                count_fixed += 1
            
            rows.append({
                'id': id_val,
                'category': category,
                'prompt': final_text
            })

    # Save with CLEAN headers (lowercase)
    with open(output_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['id', 'category', 'prompt'])
        writer.writeheader()
        writer.writerows(rows)
        
    print(f"Standardization Complete.")
    print(f"Total: {len(rows)}")
    print(f"Already Standard: {count_already}")
    print(f"Fixed: {count_fixed}")
    print(f"Saved to: {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="data/prompts.csv")
    parser.add_argument("--output", default="data/prompts_standardized.csv")
    args = parser.parse_args()
    
    standardize_prompts(args.input, args.output)
