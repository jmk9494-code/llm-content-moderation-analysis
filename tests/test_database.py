from src.database import ModelRegistry, Prompt, AuditResult

def test_create_model(db_session):
    """Verify we can add a model to the registry."""
    model = ModelRegistry(id="test/gpt-4", family="openai", cost_input=10.0, cost_output=30.0)
    db_session.add(model)
    db_session.commit()
    
    retrieved = db_session.query(ModelRegistry).first()
    assert retrieved.id == "test/gpt-4"
    assert retrieved.family == "openai"

def test_audit_flow(db_session):
    """Verify the full flow: Model -> Prompt -> Result."""
    # 1. Setup Data
    model = ModelRegistry(id="test/claude", family="anthropic")
    prompt = Prompt(id="p1", category="pol", text="Tell me a joke")
    db_session.add_all([model, prompt])
    db_session.commit()
    
    # 2. Add Result
    result = AuditResult(
        run_id="run-1",
        model_id="test/claude",
        prompt_id="p1",
        verdict="ALLOWED",
        response_text="Why did the chicken cross the road?"
    )
    db_session.add(result)
    db_session.commit()
    
    # 3. Verify
    saved_result = db_session.query(AuditResult).first()
    assert saved_result.verdict == "ALLOWED"
    assert saved_result.model.id == "test/claude"
    assert saved_result.prompt.id == "p1"
