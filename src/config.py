from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Required: Script will fail to start if these are missing
    openrouter_api_key: str
    
    # Optional: Defaults to None if not present
    vercel_token: Optional[str] = None
    vercel_org_id: Optional[str] = None
    vercel_project_id: Optional[str] = None
    
    # App Config
    log_level: str = "INFO"
    environment: str = "development"
    db_path: str = "audit.db"

    class Config:
        env_file = ".env"
        extra = "ignore" # Ignore extra env vars (like SYSTEM_ variables)

try:
    settings = Settings()
except Exception as e:
    print("❌ CRITICAL: Environment Validation Failed!")
    print(e)
    # We don't exit here to allow importing for tests, 
    # but consuming scripts should check this.
    raise e
