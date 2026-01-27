import os
import subprocess
import sys

def main():
    print("🚀 Starting Full Weekly Benchmark...")
    
    # Define the commands to run
    # 1. Paternalism Check (Audit with Personas) on Efficiency Tier (for cost reasons in CI)
    cmd_paternalism = [
        sys.executable, "src/audit_runner.py",
        "--preset", "efficiency",
        "--paternalism",
        "--limit", "50", # Cap cost
        "--output", "web/public/audit_log.csv" # Append to public log
    ]
    
    print(f"Running: {' '.join(cmd_paternalism)}")
    ret = subprocess.call(cmd_paternalism)
    if ret != 0:
        print("❌ Benchmark failed.")
        sys.exit(ret)
        
    print("✅ Benchmark Completed Successfully.")

if __name__ == "__main__":
    main()
