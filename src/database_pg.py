"""
PostgreSQL Database Adapter

This module provides PostgreSQL support for the audit system.
Falls back to SQLite if DATABASE_URL is not configured.

Environment Variables:
    DATABASE_URL: PostgreSQL connection string (e.g., postgresql://user:pass@host:5432/dbname)
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

from database import Base, ModelRegistry, Prompt, AuditResult

# Connection pool settings for production
POOL_SIZE = 5
MAX_OVERFLOW = 10
POOL_TIMEOUT = 30


def get_database_url():
    """
    Returns the database URL.
    Priority: DATABASE_URL env var > SQLite fallback
    """
    database_url = os.environ.get("DATABASE_URL")
    
    if database_url:
        # Render.com uses postgres:// but SQLAlchemy requires postgresql://
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        return database_url
    
    # Fallback to SQLite
    return "sqlite:///audit.db"


def create_db_engine(database_url=None):
    """
    Creates a SQLAlchemy engine with appropriate settings for the database type.
    """
    url = database_url or get_database_url()
    
    if url.startswith("postgresql://"):
        # PostgreSQL with connection pooling
        engine = create_engine(
            url,
            poolclass=QueuePool,
            pool_size=POOL_SIZE,
            max_overflow=MAX_OVERFLOW,
            pool_timeout=POOL_TIMEOUT,
            pool_pre_ping=True,  # Check connection health before use
        )
    else:
        # SQLite (no pooling needed)
        engine = create_engine(url)
    
    return engine


def init_db(database_url=None):
    """
    Initializes the database and creates tables if they don't exist.
    Returns a sessionmaker bound to the engine.
    """
    engine = create_db_engine(database_url)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)


def get_session(database_url=None):
    """
    Returns a new database session.
    """
    engine = create_db_engine(database_url)
    Session = sessionmaker(bind=engine)
    return Session()


def is_postgres():
    """
    Returns True if using PostgreSQL, False if using SQLite.
    """
    return get_database_url().startswith("postgresql://")


def get_db_info():
    """
    Returns information about the current database configuration.
    Useful for health checks and debugging.
    """
    url = get_database_url()
    return {
        "type": "postgresql" if is_postgres() else "sqlite",
        "url_masked": url.split("@")[-1] if is_postgres() else url,
        "pool_size": POOL_SIZE if is_postgres() else "N/A",
    }
