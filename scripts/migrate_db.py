
import sqlite3
import os

DB_PATH = "audit.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"No database found at {DB_PATH}. It will be created fresh.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    columns = [
        ("classification_category", "TEXT"),
        ("confidence_score", "FLOAT DEFAULT 0.0"),
        ("classification_reasoning", "TEXT")
    ]
    
    for col_name, col_type in columns:
        try:
            cursor.execute(f"ALTER TABLE audit_results ADD COLUMN {col_name} {col_type}")
            print(f"Added column {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"Column {col_name} already exists.")
            else:
                print(f"Error adding {col_name}: {e}")
                
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
