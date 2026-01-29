import sqlite3
import os

DB_PATH = 'audit.db'

def check_db():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # List tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"Tables: {tables}")
        
        for table in tables:
            table_name = table[0]
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"Table '{table_name}': {count} rows")
            
            # Check for timestamp column to see range
            # Assuming 'test_date' or similar exists, let's check schema
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = [info[1] for info in cursor.fetchall()]
            print(f"  Columns: {columns}")
            
    except Exception as e:
        print(f"Error reading DB: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    check_db()
