from unittest.mock import MagicMock, patch
from src.analyst import generate_weekly_report
from src.database import AuditResult

def test_generate_report_no_data(db_session, caplog):
    """Verify that empty DB results in a warning log."""
    generate_weekly_report(output_dir="/tmp")
    assert "No audit log found" in caplog.text

@patch("src.analyst.OpenAI")
def test_generate_report_success(mock_openai_class, db_session):
    """Verify report generation with mocked OpenAI."""
    # 1. Setup Mock
    mock_client = MagicMock()
    mock_openai_class.return_value = mock_client
    
    # Mock the chat completion response
    mock_completion = MagicMock()
    mock_completion.choices[0].message.content = "Mocked Report Content"
    mock_client.chat.completions.create.return_value = mock_completion

    # 2. Setup Data
    results = [
        AuditResult(model_id="gpt-4", verdict="ALLOWED", prompt_id="p1", response_text="ok"),
        AuditResult(model_id="gpt-4", verdict="REMOVED", prompt_id="p2", response_text="bad"),
    ]
    db_session.add_all(results)
    db_session.commit()

    # 3. Run
    # We patch get_session to return our test db_session
    with patch("src.analyst.get_session", return_value=db_session):
        generate_weekly_report(output_dir="/tmp", report_file="test_report.md")
    
    # 4. Verify
    with open("/tmp/test_report.md", "r") as f:
         content = f.read()
         assert content == "Mocked Report Content"
    
    # Verify OpenAI was called
    mock_client.chat.completions.create.assert_called_once()
