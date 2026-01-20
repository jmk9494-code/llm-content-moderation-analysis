import pandas as pd
from src.analyst import generate_weekly_report
from src.analyst import generate_weekly_report
from src.audit_runner import update_trends

def finalize():
    print("Updating trends...")
    update_trends("audit_log.csv", "data/trends.csv")
    print("Generating report...")
    generate_weekly_report("audit_log.csv", "data/latest_report.md")

if __name__ == "__main__":
    finalize()
