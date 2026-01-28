import os
import json
import base64
import argparse

def obfuscate_file(input_path, output_path):
    if not os.path.exists(input_path):
        print(f"❌ Input file not found: {input_path}")
        return

    print(f"🔒 Obfuscating {input_path}...")
    
    with open(input_path, 'r', encoding='utf-8') as f:
        data = f.read()
        
    # Encode to Base64
    encoded_bytes = base64.b64encode(data.encode('utf-8'))
    encoded_str = encoded_bytes.decode('utf-8')
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(encoded_str)
        
    print(f"✅ Saved obfuscated data to {output_path}")
    print(f"⚠️  REMINDER: Add {input_path} to .gitignore!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="data/sensitive_topics.json", help="Input JSON file path")
    parser.add_argument("--output", default="data/sensitive_topics.b64", help="Output B64 file path")
    args = parser.parse_args()
    
    obfuscate_file(args.input, args.output)
