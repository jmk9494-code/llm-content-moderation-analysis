import re
import csv
import gzip
import shutil

INPUT_CSV = 'web/public/audit_log.csv'
OUTPUT_GZ = 'web/public/audit_log.csv.gz'

# Patterns
PATTERNS = [
    (r'sk-[a-zA-Z0-9-]{20,}', '[REDACTED_OPENAI_KEY]'),
    (r'AKID[a-zA-Z0-9]{10,}', '[REDACTED_TENCENT_KEY]'),
    (r'AIza[a-zA-Z0-9-_]{10,}', '[REDACTED_GOOGLE_KEY]'),
    (r'ghp_[a-zA-Z0-9]{10,}', '[REDACTED_GITHUB_KEY]')
]

def scrub():
    print(f"Scrubbing {INPUT_CSV}...")
    with open(INPUT_CSV, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    matches = 0
    for pattern, replacement in PATTERNS:
        content, count = re.subn(pattern, replacement, content)
        matches += count
        if count > 0:
            print(f"Redacted {count} instances of {pattern}")

    print(f"Total redactions: {matches}")

    # Write back CSV
    with open(INPUT_CSV, 'w', encoding='utf-8') as f:
        f.write(content)

    # Re-compress
    print(f"Compressing to {OUTPUT_GZ}...")
    with open(INPUT_CSV, 'rb') as f_in:
        with gzip.open(OUTPUT_GZ, 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)
    
    print("Done.")

if __name__ == "__main__":
    scrub()
