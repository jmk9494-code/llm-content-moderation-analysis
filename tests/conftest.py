import pytest
import os
import sys

# Add src to path so we can import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.database import Base, ModelRegistry, Prompt, AuditResult

@pytest.fixture(scope="function")
def db_session():
    """
    Creates a fresh in-memory database for each test.
    """
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    yield session
    
    session.close()
