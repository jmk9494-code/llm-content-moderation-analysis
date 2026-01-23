
import pytest
import asyncio
import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from src import audit_runner

@pytest.mark.asyncio
async def test_process_prompt_success():
    """
    Verifies that process_prompt returns a proper dictionary
    when the API call is successful.
    """
    # Mock data
    prompt = {'id': 'test-1', 'category': 'safety', 'text': 'Test prompt'}
    model_name = 'test/model-v1'
    
    # Mock dependencies
    # 1. Mock API call
    with patch('src.audit_runner.call_target_model_async', new_callable=AsyncMock) as mock_api:
        # Return content and a dummy usage object
        mock_usage = MagicMock()
        mock_usage.prompt_tokens = 10
        mock_usage.completion_tokens = 5
        mock_usage.total_tokens = 15
        mock_api.return_value = ("Test response", mock_usage)
        
        # 2. Mock Database Session to avoid actual DB writes
        with patch('src.audit_runner.Session') as mock_session_cls:
            mock_session = mock_session_cls.return_value
            # We don't care about what the DB does, just that it doesn't crash
            
            # 3. Mock Check Cache (force rerun)
            with patch('src.audit_runner.check_cache', return_value=None):
                
                # Run the function
                sem = asyncio.Semaphore(1)
                result = await audit_runner.process_prompt(sem, prompt, model_name, force_rerun=True)
                
                # Assertions
                assert result is not None, "process_prompt returned None!"
                assert isinstance(result, dict), "Result should be a dictionary"
                
                # Check keys needed for CSV
                assert result['model'] == model_name
                assert result['prompt_id'] == prompt['id']
                assert result['prompt_text'] == prompt['text']
                assert result['verdict'] is not None
                assert 'run_cost' in result

@pytest.mark.asyncio
async def test_process_prompt_api_failure():
    """
    Verifies that process_prompt returns a dictionary (with error info)
    even when the API call fails.
    """
    prompt = {'id': 'test-2', 'category': 'harmful', 'text': 'Bad prompt'}
    model_name = 'test/fail-model'
    
    with patch('src.audit_runner.call_target_model_async', new_callable=AsyncMock) as mock_api:
        # Simulate API Error
        mock_api.side_effect = Exception("API Connection Failed")
        
        with patch('src.audit_runner.Session') as mock_session_cls:
            with patch('src.audit_runner.check_cache', return_value=None):
                
                sem = asyncio.Semaphore(1)
                result = await audit_runner.process_prompt(sem, prompt, model_name, force_rerun=True)
                
                assert result is not None, "Should return result even on failure"
                assert "ERROR" in result['response_text']
                assert result['verdict'] == "ERROR" or result['verdict'] == "BLOCKED"

@pytest.mark.asyncio
async def test_process_prompt_cache_hit():
    """
    Verifies that process_prompt returns a dictionary
    when a valid cache entry is found.
    """
    prompt = {'id': 'test-3', 'category': 'safety', 'text': 'Cached prompt'}
    model_name = 'test/cached-model'
    
    # Mock Cached Result (AuditResult object)
    mock_cached = MagicMock()
    mock_cached.timestamp = datetime.datetime.now()
    mock_cached.model_id = model_name
    mock_cached.prompt_id = prompt['id']
    mock_cached.verdict = 'ALLOWED'
    mock_cached.response_text = 'Cached response'
    mock_cached.prompt_tokens = 5
    mock_cached.completion_tokens = 5
    mock_cached.cost = 0.0001

    with patch('src.audit_runner.check_cache', return_value=mock_cached):
        sem = asyncio.Semaphore(1)
        result = await audit_runner.process_prompt(sem, prompt, model_name, force_rerun=False)
        
        assert result is not None, "Should return result on cache hit"
        assert result['verdict'] == 'ALLOWED'
        assert result['response_text'] == 'Cached response'
        assert result['model'] == model_name
