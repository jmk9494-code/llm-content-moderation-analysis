#!/usr/bin/env python3
import sys
import argparse
from src.audit_runner import main as run_audit
from src.cleanup_data import clean_all

def clean():
    clean_all()

def main():
    parser = argparse.ArgumentParser(description="LLM Content Moderation Manager")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Audit Command
    audit_parser = subparsers.add_parser("audit", help="Run the audit process")
    # Forward arguments to audit runner if needed, but for now strict separation
    
    # Clean Command
    subparsers.add_parser("clean", help="Clean up CSV data")
    
    # Report Command
    subparsers.add_parser("report", help="Generate trends and report")
    
    # Migrate Command
    subparsers.add_parser("migrate", help="Migrate CSV data to SQLite")

    args = parser.parse_args()

    if args.command == "audit":
        # We need to handle async if main is async, but usually main() calls asyncio.run
        # src/audit_runner.py has `if __name__ == "__main__": asyncio.run(main())`
        # Let's check strict signature of run_audit
        try:
            # src/audit_runner.py's main() calls asyncio.run internally now
            run_audit()
        except Exception as e:
            print(f"Error running audit: {e}")
            sys.exit(1)
            
    elif args.command == "clean":
        clean()
        
    elif args.command == "report":
        run_report()
        
    elif args.command == "migrate":
        run_migrate()
        
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
