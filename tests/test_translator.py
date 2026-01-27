
import unittest
from unittest.mock import AsyncMock, MagicMock
from src.modules.translator import PromptTranslator

class TestTranslator(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.mock_client = AsyncMock()
        self.translator = PromptTranslator(self.mock_client)

    async def test_translate_text(self):
        # Mock API response
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Hola Mundo"
        
        self.mock_client.chat.completions.create.return_value = mock_response
        
        result = await self.translator.translate_text("Hello World", "es")
        self.assertEqual(result, "Hola Mundo")
        
    async def test_translate_prompts(self):
        # Mock for batch translation
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Translated Text"
        
        self.mock_client.chat.completions.create.return_value = mock_response
        
        prompts = [
            {"id": "test1", "category": "cat1", "text": "Hello"}
        ]
        
        new_prompts = await self.translator.translate_prompts(prompts)
        
        # We expect 3 translations (zh, ru, ar)
        self.assertEqual(len(new_prompts), 3)
        self.assertEqual(new_prompts[0]['original_english'], "Hello")
        self.assertEqual(new_prompts[0]['text'], "Translated Text")
        self.assertIn("-ZH", new_prompts[0]['id'])

if __name__ == '__main__':
    unittest.main()
