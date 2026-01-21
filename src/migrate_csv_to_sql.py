
import csv
import sqlite3
import os
import uuid
import datetime

# Paths
AUDIT_CSV = "web/public/audit_log.csv"
GRADES_CSV = "web/public/human_grades.csv"
DB_PATH = "audit.db"

def init_db():
    """Create tables using raw SQL."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Models Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS models (
            id TEXT PRIMARY KEY,
            family TEXT,
            cost_input REAL DEFAULT 0,
            cost_output REAL DEFAULT 0
        )
    ''')
    
    # Prompts Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS prompts (
            id TEXT PRIMARY KEY,
            category TEXT,
            text TEXT
        )
    ''')
    
    # Audit Results Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS audit_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT,
            timestamp DATETIME,
            model_id TEXT,
            prompt_id TEXT,
            verdict TEXT,
            response_text TEXT,
            cost REAL DEFAULT 0,
            prompt_tokens INTEGER DEFAULT 0,
            completion_tokens INTEGER DEFAULT 0,
            human_verdict TEXT,
            notes TEXT,
            FOREIGN KEY(model_id) REFERENCES models(id),
            FOREIGN KEY(prompt_id) REFERENCES prompts(id)
        )
    ''')
    
    conn.commit()
    return conn

def migrate():
    print(f"Initializing database at {DB_PATH} using sqlite3...")
    conn = init_db()
    c = conn.cursor()

    # 1. Migrate Audit Log
    if os.path.exists(AUDIT_CSV):
        print(f"Reading {AUDIT_CSV}...")
        with open(AUDIT_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            count = 0
            for row in reader:
                # ID Handling
                cid = row.get('case_id') or row.get('prompt_id') or str(uuid.uuid4())
                
                # Model
                model_id = row.get('model', 'unknown')
                family = model_id.split('/')[0] if '/' in model_id else "unknown"
                c.execute("INSERT OR IGNORE INTO models (id, family) VALUES (?, ?)", (model_id, family))
                
                # Prompt
                p_text = row.get('prompt') or row.get('prompt_text')
                if not p_text: continue
                p_id = row.get('prompt_id') or str(hash(p_text))
                cat = row.get('category', 'unknown')
                c.execute("INSERT OR IGNORE INTO prompts (id, category, text) VALUES (?, ?, ?)", (p_id, cat, p_text))
                
                # Audit Result
                # Check for timestamp format
                ts_str = row.get('timestamp') or row.get('test_date')
                # Try to clean/parse timestamp or store as string (sqlite is loose)
                
                c.execute('''
                    INSERT INTO audit_results (run_id, timestamp, model_id, prompt_id, verdict, response_text, cost, prompt_tokens, completion_tokens)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    cid, 
                    ts_str, 
                    model_id, 
                    p_id, 
                    row.get('verdict'), 
                    row.get('response') or row.get('response_text'),
                    row.get('cost') or 0,
                    row.get('prompt_tokens') or 0,
                    row.get('completion_tokens') or 0
                ))
                count += 1
            
            print(f"Migrated {count} audit rows.")
            conn.commit()

    # 2. Migrate Grades
    if os.path.exists(GRADES_CSV):
        print(f"Reading {GRADES_CSV}...")
        with open(GRADES_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            count = 0
            for row in reader:
                case_id = row.get('case_id')
                h_verdict = row.get('human_verdict')
                notes = row.get('notes', '')
                
                if case_id and h_verdict:
                    # Update nearest match by run_id
                    c.execute('''
                        UPDATE audit_results 
                        SET human_verdict = ?, notes = ?
                        WHERE run_id = ?
                    ''', (h_verdict, notes, case_id))
                    if c.rowcount > 0: count += 1
            
            print(f"Merged {count} grades.")
            conn.commit()

    conn.close()
    print("Migration complete (Dependency-Free).")
    
if __name__ == "__main__":
    migrate()
