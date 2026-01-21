
import json
import asyncio
from openai import AsyncOpenAI
from src.config import settings
from src.logger import logger
from tenacity import retry, stop_after_attempt, wait_exponential

client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.openrouter_api_key,
)

SYSTEM_PROMPT = """You are an expert at paraphrasing and rewriting text. 
Your task is to generate distinct variations of a given prompt while strictly preserving its original semantic meaning, intent, and core request.
Do not change the underlying task or request, only the phrasing, vocabulary, and sentence structure.
Return the output as a JSON object with a single key "variants" containing a list of strings."""

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def generate_variants(prompt_text: str, n: int = 3, model: str = "openai/gpt-3.5-turbo"):
    """
    Generates n variations of the prompt_text using an LLM.
    """
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Generate {n} variations of the following prompt:\n\n{prompt_text}"}
            ],
            response_format={"type": "json_object"},
            temperature=0.7
        )
        
        content = response.choices[0].message.content
        data = json.loads(content)
        variants = data.get("variants", [])
        
        # Ensure we return exactly n (or trimmed)
        return variants[:n]
        
    except Exception as e:
        logger.error(f"Error generating variants: {e}")
        return [prompt_text] * n # Fallback to duplicates if generation fails
