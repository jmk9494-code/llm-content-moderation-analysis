import os
import json
import datetime
import shutil

HISTORY_DIR = "web/public/assets/history"
MANIFEST_PATH = f"{HISTORY_DIR}/manifest.json"

def save_snapshot(audit_file="web/public/audit_log.csv"):
    """
    Saves a snapshot of the current audit log to the history directory.
    Updates the manifest.json with the new snapshot.
    """
    if not os.path.exists(audit_file):
        print(f"❌ Audit file not found: {audit_file}")
        return

    # Ensure History Dir
    os.makedirs(HISTORY_DIR, exist_ok=True)
    
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    snapshot_filename = f"traces_{today}.json"
    snapshot_path = os.path.join(HISTORY_DIR, snapshot_filename)
    
    # Convert CSV to JSON for snapshot
    try:
        import pandas as pd
        df = pd.read_csv(audit_file, on_bad_lines='skip', engine='python')
        # Filter relevant columns to save space if needed, or keep all
        # To match expected schema in traces.json:
        # model, category, prompt_text, response_text, verdict
        data = df.to_dict(orient='records')
        
        with open(snapshot_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
            
        print(f"📸 Snapshot saved: {snapshot_path}")
    except Exception as e:
        print(f"❌ Failed to save JSON snapshot: {e}")
        return
    
    # Update Manifest
    manifest = []
    if os.path.exists(MANIFEST_PATH):
        try:
            with open(MANIFEST_PATH, 'r') as f:
                manifest = json.load(f)
        except:
            pass
            
    # Add new entry if not exists
    entry = {"date": today, "file": snapshot_filename}
    if entry not in manifest:
        manifest.append(entry)
        # Sort by date
        manifest.sort(key=lambda x: x['date'], reverse=True)
        
        with open(MANIFEST_PATH, 'w') as f:
            json.dump(manifest, f, indent=2)
        print(f"📜 Manifest updated: {len(manifest)} snapshots total.")
    else:
        print("📜 Manifest already up to date.")

if __name__ == "__main__":
    save_snapshot()
