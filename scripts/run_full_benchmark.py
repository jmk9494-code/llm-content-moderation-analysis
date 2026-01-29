import os
import subprocess
import sys

def main():
    print("🚀 Starting Full Weekly Benchmark...")
    
    # Define the commands to run
    # 1. Paternalism Check (Audit with Personas) on Efficiency Tier (for cost reasons in CI)
    cmd_paternalism = [
        sys.executable, "-m", "src.audit_runner",
        "--preset", "all",
        "--consistency", "1", # Input file already has runs expanded
        # "--paternalism", # Input file likely has split personas? Need to check. 
        # Actually audit_runner handles paternalism by splitting prompts. 
        # If DB export has them, we disable this.
        # "--limit", "50", 
        "--input", "data/prompts_full_db.csv", 
        "--output", "web/public/audit_log.csv"
    ]
    
    print(f"Running: {' '.join(cmd_paternalism)}")
    ret = subprocess.call(cmd_paternalism)
    if ret != 0:
        print("❌ Benchmark failed.")
        sys.exit(ret)
        
    print("✅ Benchmark Completed Successfully.")

if __name__ == "__main__":
    main()
