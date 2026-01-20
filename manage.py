#!/usr/bin/env python3
import sys
import argparse
from src.audit_runner import main as run_audit
from src.cleanup_data import clean_all
from src.run_strategy_audit import main as run_strategy
from src.generate_prompts import main as run_generator

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

    # Strategy Audit Command
    strategy_parser = subparsers.add_parser("strategy", help="Run adversarial strategy audit")
    # We can rely on sys.argv parsing inside the called main(), 
    # but since we are using a parser here, we need to pass known_args?
    # Actually, simpler approach: if command matches, just call the runner's main(), 
    # which will parse sys.argv.
    # HOWEVER, doing so might make the runner's argparse fail because of 'manage.py strategy' arguments.
    # For a unified CLI, it's cleaner to handle args here or use `argparse.REMAINDER`.
    
    # Just adding them for now. If called, we might need to trick sys.argv or handle it cleaner.
    # For now let's just expose them.
    subparsers.add_parser("generate", help="Generate AI prompts")

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

    elif args.command == "strategy":
        # Hack to remove 'strategy' from argv so the submodule parser works
        sys.argv.pop(1)
        run_strategy()
    
    elif args.command == "generate":
        # Hack to remove 'generate' from argv
        sys.argv.pop(1)
        run_generator()
        
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
