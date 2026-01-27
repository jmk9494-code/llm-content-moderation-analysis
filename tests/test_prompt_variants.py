
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.prompt_variants import generate_styled_variants

@pytest.fixture
def mock_client():
    with patch('src.prompt_variants.client') as mock:
        mock.chat.completions.create = AsyncMock()
        yield mock

@pytest.mark.asyncio
async def test_generate_styled_variants_success(mock_client):
    # Mock LLM response
    mock_response = MagicMock()
    mock_response.choices[0].message.content = '{"Direct": "Do X", "Roleplay": "Act as Z doing X", "Academic": "Study X"}'
    mock_client.chat.completions.create.return_value = mock_response
    
    result = await generate_styled_variants("Original Prompt")
    
    assert result['Direct'] == "Do X"
    assert result['Roleplay'] == "Act as Z doing X"
    assert result['Academic'] == "Study X"

@pytest.mark.asyncio
async def test_generate_styled_variants_fallback(mock_client):
    # Mock failure
    mock_client.chat.completions.create.side_effect = Exception("API Error")
    
    result = await generate_styled_variants("Original Prompt")
    
    # Should fall back to original
    assert result['Direct'] == "Original Prompt"
    assert result['Roleplay'] == "Original Prompt"
