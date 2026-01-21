"""
SQLite to PostgreSQL Migration Script

Usage:
    export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
    python src/migrate_to_postgres.py
"""

import os
import sqlite3
from datetime import datetime

# Ensure psycopg2 is available
try:
    import psycopg2
    from psycopg2.extras import execute_batch
except ImportError:
    print("Error: psycopg2 not installed. Run: pip install psycopg2-binary")
    exit(1)


SQLITE_PATH = "audit.db"


def get_pg_connection():
    """Get PostgreSQL connection from DATABASE_URL."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("Error: DATABASE_URL environment variable not set.")
        exit(1)
    
    # Render.com uses postgres:// but psycopg2 requires postgresql://
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    return psycopg2.connect(database_url)


def create_pg_schema(pg_conn):
    """Create tables in PostgreSQL."""
    cursor = pg_conn.cursor()
    
    # Models table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS models (
            id VARCHAR(255) PRIMARY KEY,
            family VARCHAR(255),
            cost_input REAL DEFAULT 0.0,
            cost_output REAL DEFAULT 0.0
        )
    """)
    
    # Prompts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS prompts (
            id VARCHAR(255) PRIMARY KEY,
            category VARCHAR(255),
            text TEXT,
            parent_category VARCHAR(255)
        )
    """)
    
    # Audit Results table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_results (
            id SERIAL PRIMARY KEY,
            run_id VARCHAR(255),
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            model_id VARCHAR(255) REFERENCES models(id),
            prompt_id VARCHAR(255) REFERENCES prompts(id),
            verdict VARCHAR(50),
            response_text TEXT,
            cost REAL DEFAULT 0.0,
            prompt_tokens INTEGER DEFAULT 0,
            completion_tokens INTEGER DEFAULT 0,
            human_verdict VARCHAR(50),
            notes TEXT,
            confidence_score REAL,
            policy_version VARCHAR(255)
        )
    """)
    
    # Create indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_run_id ON audit_results(run_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_model_id ON audit_results(model_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON audit_results(timestamp)")
    
    pg_conn.commit()
    print("✓ PostgreSQL schema created")


def migrate_table(sqlite_conn, pg_conn, table_name, columns):
    """Migrate a single table from SQLite to PostgreSQL."""
    sqlite_cursor = sqlite_conn.cursor()
    pg_cursor = pg_conn.cursor()
    
    # Fetch all rows from SQLite
    sqlite_cursor.execute(f"SELECT {', '.join(columns)} FROM {table_name}")
    rows = sqlite_cursor.fetchall()
    
    if not rows:
        print(f"✓ {table_name}: No rows to migrate")
        return 0
    
    # Insert into PostgreSQL
    placeholders = ", ".join(["%s"] * len(columns))
    insert_sql = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"
    
    execute_batch(pg_cursor, insert_sql, rows)
    pg_conn.commit()
    
    print(f"✓ {table_name}: Migrated {len(rows)} rows")
    return len(rows)


def main():
    print("=" * 50)
    print("SQLite → PostgreSQL Migration")
    print("=" * 50)
    
    # Check SQLite exists
    if not os.path.exists(SQLITE_PATH):
        print(f"Error: SQLite database not found at {SQLITE_PATH}")
        exit(1)
    
    # Connect to both databases
    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    pg_conn = get_pg_connection()
    
    try:
        # Create schema
        create_pg_schema(pg_conn)
        
        # Migrate tables
        total = 0
        total += migrate_table(sqlite_conn, pg_conn, "models", ["id", "family", "cost_input", "cost_output"])
        total += migrate_table(sqlite_conn, pg_conn, "prompts", ["id", "category", "text"])
        total += migrate_table(
            sqlite_conn, pg_conn, "audit_results",
            ["run_id", "timestamp", "model_id", "prompt_id", "verdict", "response_text", 
             "cost", "prompt_tokens", "completion_tokens", "human_verdict", "notes"]
        )
        
        print("=" * 50)
        print(f"Migration complete! Total rows: {total}")
        print("=" * 50)
        
    finally:
        sqlite_conn.close()
        pg_conn.close()


if __name__ == "__main__":
    main()
