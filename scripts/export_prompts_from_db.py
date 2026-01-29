import sqlite3
import csv
import os

DB_PATH = 'audit.db'
OUTPUT_CSV = 'data/prompts_full_db.csv'

def export_prompts():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        print("Fetching prompts from DB...")
        cursor.execute("SELECT id, category, text FROM prompts")
        rows = cursor.fetchall()
        
        print(f"Found {len(rows)} prompts.")
        
        with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['Prompt_ID', 'Category', 'Prompt_Text'])
            for r in rows:
                writer.writerow(r)
                
        print(f"✅ Exported to {OUTPUT_CSV}")
        
    except Exception as e:
        print(f"Error exporting: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    export_prompts()
