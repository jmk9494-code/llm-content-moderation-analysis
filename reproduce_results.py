
import os
import random
import logging
import argparse
import sys
from src.audit_runner import main as audit_main

# Set fixed seed for global reproducibility
SEED = 42

def reproduce():
    """
    Master reproduction script.
    1. Sets environment seed.
    2. Runs the audit pipeline with strict parameters.
    3. Verifies output artifacts exist.
    """
    print(f"🔬 REPRODUCIBILITY MODE INITIATED (SEED={SEED})")
    
    # 1. Set Seeds
    random.seed(SEED)
    os.environ['PYTHONHASHSEED'] = str(SEED)
    
    # 2. Mock Arguments for audit_runner
    # We want to run a SMALL but rigorous test.
    # We'll use --limit to avoid huge costs during verification, 
    # but strictly enforce N=5 and --perturb.
    
    # Note: We are simulating command line args by hacking sys.argv or calling main logic directly.
    # Calling main logic directly is safer if refactored, but audit_runner.main() parses sys.argv.
    # Let's override sys.argv.
    
    original_argv = sys.argv
    sys.argv = [
        "audit_runner.py",
        "--model", "google/gemini-2.0-flash-001", # Cheap, fast, smart enough
        "--consistency", "5",
        "--perturb",
        "--limit", "1", # Process 1 prompt (which becomes 3 variants * 5 runs = 15 calls)
        "--output", "data/reproduction_audit.csv"
    ]
    
    print(f"Running command: {' '.join(sys.argv)}")
    
    try:
        audit_main()
        print("\n✅ Audit Run Complete.")
    except Exception as e:
        print(f"\n❌ Audit Run Failed: {e}")
        return

    # 3. Verify Artifacts
    print("\nVerifying Artifacts...")
    
    # Check CSV
    if os.path.exists("data/reproduction_audit.csv"):
        print(" -> Output CSV found.")
        # Optional: Check row count. Should be ~15 rows (3 variants * 5 runs)
        # unless errors occurred.
    else:
        print(" -> ❌ Output CSV MISSING.")
        
    # Check Raw Traces
    trace_dir = "data/raw_traces"
    if os.path.exists(trace_dir) and len(os.listdir(trace_dir)) > 0:
        count = len(os.listdir(trace_dir))
        print(f" -> Raw Traces directory found with {count} files.")
    else:
        print(" -> ❌ Raw Traces MISSING or EMPTY.")
        
    # Restore sys.argv
    sys.argv = original_argv

if __name__ == "__main__":
    reproduce()
