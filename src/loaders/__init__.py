
import csv
import os
import logging

logger = logging.getLogger("audit_logger")

def load_prompts(file_path, limit=None):
    """
    Loads prompts from a CSV file.
    Expected columns: id, category, prompt (or prompt_text)
    Returns a list of dicts: [{'id':..., 'category':..., 'text':...}]
    """
    if not os.path.exists(file_path):
        logger.error(f"Prompt file not found: {file_path}")
        return []

    prompts = []
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        # Helper for case-insensitive get
        def get_col(r, keys):
            for k in keys:
                if k in r: return r[k]
                if k.lower() in r: return r[k.lower()] # This won't work if r keys are mixed case but not lowercase in r
                # Iterate r keys
                for rk in r.keys():
                    if rk.lower() == k.lower(): return r[rk]
            return None

        for row in reader:
            # Handle variable column names with case insensitivity
            p_text = get_col(row, ['prompt', 'prompt_text', 'text', 'Prompt_Text'])
            p_id = get_col(row, ['id', 'prompt_id', 'case_id', 'Prompt_ID'])
            p_cat = get_col(row, ['category', 'Category'])
            
            # Additional fields (like style, persona from augmentation)
            p_style = row.get('style', 'Original')
            p_persona = row.get('persona', 'Default')
            
            if p_text:
                prompts.append({
                    'id': p_id,
                    'category': p_cat,
                    'text': p_text,
                    'style': p_style,
                    'persona': p_persona
                })

    if limit:
        prompts = prompts[:limit]

    logger.info(f"Loaded {len(prompts)} prompts from {file_path}")
    return prompts
