import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.sql import func
import datetime

# --- Database Setup ---
Base = declarative_base()

class ModelRegistry(Base):
    __tablename__ = 'models'
    
    id = Column(String, primary_key=True)  # e.g., "openai/gpt-4o"
    family = Column(String)                # e.g., "openai"
    cost_input = Column(Float, default=0.0)
    cost_output = Column(Float, default=0.0)
    
    # Relationships
    results = relationship("AuditResult", back_populates="model")

class Prompt(Base):
    __tablename__ = 'prompts'
    
    id = Column(String, primary_key=True) # e.g., "P123"
    category = Column(String)
    text = Column(Text)
    
    # Relationships
    results = relationship("AuditResult", back_populates="prompt")

class AuditResult(Base):
    __tablename__ = 'audit_results'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String, index=True) # UUID for the batch run
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    model_id = Column(String, ForeignKey('models.id'))
    prompt_id = Column(String, ForeignKey('prompts.id'))
    
    verdict = Column(String) # ALLOWED, BLOCKED, REFUSAL, ERROR
    response_text = Column(Text)
    
    cost = Column(Float, default=0.0)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)

    # Human Grading
    human_verdict = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Relationships
    model = relationship("ModelRegistry", back_populates="results")
    prompt = relationship("Prompt", back_populates="results")

def init_db(db_path="audit.db"):
    """
    Initializes the SQLite database and creates tables if they don't exist.
    """
    engine = create_engine(f'sqlite:///{db_path}')
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)

def get_session(db_path="audit.db"):
    """Returns a new session."""
    engine = create_engine(f'sqlite:///{db_path}')
    Session = sessionmaker(bind=engine)
    return Session()
