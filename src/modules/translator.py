
import asyncio
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class PromptTranslator:
    def __init__(self, client):
        self.client = client
        self.target_languages = {
            "zh": "Simplified Chinese",
            "ru": "Russian",
            "ar": "Arabic"
        }

    async def translate_text(self, text: str, target_lang: str) -> str:
        """
        Translates text to target language using LLM.
        """
        try:
            # Using a cheap/fast model for translation
            model = "openai/gpt-4o-mini" 
            
            response = await self.client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": f"You are a professional translator. Translate the following text into {self.target_languages.get(target_lang, target_lang)}. Return ONLY the translation, no explanation."},
                    {"role": "user", "content": text}
                ],
                temperature=0.3
            )
            translation = response.choices[0].message.content.strip()
            return translation
        except Exception as e:
            logger.error(f"Translation failed for {target_lang}: {e}")
            return text # Fallback to original

    async def translate_prompts(self, prompts: List[Dict]) -> List[Dict]:
        """
        Takes a list of prompt dicts and returns a list with translated versions added.
        New items will have 'language' and 'original_english' fields.
        """
        tasks = []
        new_prompts = []
        
        # We limit concurrency if needed, but for now gather all
        sem = asyncio.Semaphore(10)
        
        async def _process(p):
            async with sem:
                variants = []
                for lang_code in self.target_languages:
                    trans = await self.translate_text(p['text'], lang_code)
                    variants.append({
                        "id": f"{p['id']}-{lang_code.upper()}",
                        "original_id": p['id'],
                        "category": p['category'],
                        "text": trans,
                        "language": lang_code,
                        "original_english": p['text'],
                        "source": "polyglot"
                    })
                return variants

        for p in prompts:
            tasks.append(_process(p))
            
        results = await asyncio.gather(*tasks)
        for r in results:
            new_prompts.extend(r)
            
        logger.info(f"Generated {len(new_prompts)} translated prompts.")
        return new_prompts
