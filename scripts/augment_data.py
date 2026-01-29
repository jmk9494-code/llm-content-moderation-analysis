
import asyncio
import csv
import argparse
from pathlib import Path
import random
from src.logger import logger

async def augment_data(input_path: str, output_path: str, sample_rate: float = 0.2, limit: int = None, mock: bool = False):
    """
    Reads prompts from input_path, generates augmented variants, and saves to output_path.
    """
    # Import here to avoid loading config (and checking env vars) at module level
    if not mock:
        from src.prompt_variants import generate_styled_variants
    input_file = Path(input_path)
    if not input_file.exists():
        logger.error(f"Input file not found: {input_path}")
        return

    prompts = []
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            prompts.append(row)

    logger.info(f"Loaded {len(prompts)} prompts from {input_path}")

    # Sampling
    if limit:
        selected_prompts = prompts[:limit]
    else:
        # Group by category to ensure coverage
        by_category = {}
        for p in prompts:
            cat = p['category']
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(p)
        
        selected_prompts = []
        for cat, items in by_category.items():
            k = max(1, int(len(items) * sample_rate))
            selected_prompts.extend(random.sample(items, k))
            
    logger.info(f"Selected {len(selected_prompts)} prompts for augmentation")

    augmented_rows = []
    
    # Process
    for i, p in enumerate(selected_prompts):
        original_text = p['prompt']
        original_id = p['id']
        category = p['category']
        
        logger.info(f"Processing {i+1}/{len(selected_prompts)}: {original_id}")
        
        if mock:
            variants = {
                "Direct": f"[MOCK DIRECT] Moderator, assess: {original_text}",
                "Roleplay": f"[MOCK ROLEPLAY] Act as mod, assess: {original_text}",
                "Academic": f"[MOCK ACADEMIC] Theoretical assessment of: {original_text}",
                "Organic": f"[MOCK ORGANIC] yo mod is this allowed: {original_text}",
            }
        else:
            # Imported above if not mock
            from src.prompt_variants import generate_styled_variants
            variants = await generate_styled_variants(original_text)
        
        # Add original
        augmented_rows.append({
            'id': original_id,
            'category': category,
            'prompt': original_text,
            'style': 'Original',
            'is_augmented': False
        })
        
        # Add variants
        for style, text in variants.items():
            if style == "Original": continue
            
            augmented_rows.append({
                'id': f"{original_id}-{style.upper()}",
                'category': category,
                'prompt': text,
                'style': style,
                'is_augmented': True
            })

    # Save
    fieldnames = ['id', 'category', 'prompt', 'style', 'is_augmented']
    with open(output_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(augmented_rows)
        
    logger.info(f"Saved {len(augmented_rows)} rows to {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Augment prompt dataset with styled variants")
    parser.add_argument("--input", default="data/prompts.csv", help="Input CSV path")
    parser.add_argument("--output", default="data/prompts_augmented.csv", help="Output CSV path")
    parser.add_argument("--rate", type=float, default=0.2, help="Sample rate (0.0 to 1.0)")
    parser.add_argument("--limit", type=int, help="Hard limit on number of prompts to process (for testing)")
    parser.add_argument("--mock", action="store_true", help="Generate dummy data without API calls")
    
    args = parser.parse_args()
    
    # Set dummy key for mock mode to bypass config validation
    if args.mock:
        import os
        os.environ["OPENROUTER_API_KEY"] = "mock_key_for_testing"
    
    asyncio.run(augment_data(args.input, args.output, args.rate, args.limit, args.mock))
