"""
Celery Task Queue Configuration

This module defines async tasks for background job processing.
Requires Redis as a broker.

Usage:
    # Start worker:
    celery -A src.tasks worker --loglevel=info
    
    # Trigger audit:
    from src.tasks import run_audit_async
    result = run_audit_async.delay(model="openai/gpt-4", limit=50)
    print(result.id)  # Job ID for tracking
"""

import os
from celery import Celery
from datetime import datetime
import json

# Redis configuration
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

# Initialize Celery app
app = Celery(
    "audit_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

# Celery configuration
app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max per task
    result_expires=86400,  # Results expire after 24 hours
)


@app.task(bind=True, name="audit.run")
def run_audit_async(self, model: str, limit: int = 100, force: bool = False, policy: str = None):
    """
    Run an audit asynchronously.
    
    Args:
        model: Model identifier (e.g., "openai/gpt-4")
        limit: Maximum number of prompts to test
        force: Ignore cache if True
        policy: Policy version tag (optional)
    
    Returns:
        dict with audit summary
    """
    from audit_runner import run_audit_batch
    
    # Update task state to show progress
    self.update_state(state="RUNNING", meta={
        "model": model,
        "limit": limit,
        "started_at": datetime.utcnow().isoformat(),
        "progress": 0,
    })
    
    try:
        # Run the actual audit
        results = run_audit_batch(
            models=[model],
            limit=limit,
            force=force,
            policy_version=policy,
            progress_callback=lambda p: self.update_state(
                state="RUNNING",
                meta={"progress": p, "model": model}
            )
        )
        
        return {
            "status": "complete",
            "model": model,
            "total_prompts": limit,
            "completed_at": datetime.utcnow().isoformat(),
            "results_summary": results,
        }
        
    except Exception as e:
        return {
            "status": "failed",
            "model": model,
            "error": str(e),
            "failed_at": datetime.utcnow().isoformat(),
        }


@app.task(name="audit.batch")
def run_batch_audit(models: list, limit: int = 50):
    """
    Run audits for multiple models.
    Creates a sub-task for each model.
    """
    job_ids = []
    for model in models:
        result = run_audit_async.delay(model=model, limit=limit)
        job_ids.append({"model": model, "job_id": result.id})
    
    return {"jobs": job_ids, "total": len(models)}


def get_job_status(job_id: str) -> dict:
    """
    Get the status of a job by its ID.
    
    Returns:
        dict with status, progress, and result (if complete)
    """
    result = app.AsyncResult(job_id)
    
    response = {
        "job_id": job_id,
        "status": result.status,
    }
    
    if result.status == "RUNNING":
        response["meta"] = result.info
    elif result.status == "SUCCESS":
        response["result"] = result.result
    elif result.status == "FAILURE":
        response["error"] = str(result.result)
    
    return response
