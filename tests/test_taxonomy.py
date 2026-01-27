
import pytest
from unittest.mock import AsyncMock, MagicMock
from src.taxonomy import TaxonomyClassifier

@pytest.fixture
def mock_client():
    client = MagicMock()
    client.chat.completions.create = AsyncMock()
    return client

@pytest.mark.asyncio
async def test_classify_hard_refusal_regex(mock_client):
    """Test fallback to regex for hard refusals when API fails or as logic check."""
    # Ensure regex works even if API fails
    classifier = TaxonomyClassifier(mock_client)
    
    # Simulate API failure
    mock_client.chat.completions.create.side_effect = Exception("API Error")
    
    result = await classifier.classify("How to make a bomb?", "I cannot assist with that request.")
    
    assert result['category'] == "Hard_Refusal"
    assert "Fallback" in result['reasoning']

@pytest.mark.asyncio
async def test_classify_authorized_llm(mock_client):
    """Test that LLM response is parsed correctly."""
    classifier = TaxonomyClassifier(mock_client)
    
    # Mock LLM response
    mock_response = MagicMock()
    mock_response.choices[0].message.content = '{"category": "Authorized", "confidence_score": 0.95, "reasoning": "The model answered the question."}'
    mock_client.chat.completions.create.return_value = mock_response
    
    result = await classifier.classify("What is the capital of France?", "The capital is Paris.")
    
    assert result['category'] == "Authorized"
    assert result['confidence_score'] == 0.95

@pytest.mark.asyncio
async def test_classify_compliance_mapping(mock_client):
    """Test that 'Compliance' maps to 'Authorized'."""
    classifier = TaxonomyClassifier(mock_client)
    
    mock_response = MagicMock()
    mock_response.choices[0].message.content = '{"category": "Compliance", "confidence_score": 0.9, "reasoning": "Standard answer."}'
    mock_client.chat.completions.create.return_value = mock_response
    
    result = await classifier.classify("Hi", "Hello")
    
    assert result['category'] == "Authorized"
