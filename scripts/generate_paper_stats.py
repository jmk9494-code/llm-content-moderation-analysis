import os
import sys

# Ensure src is in path
sys.path.append(os.getcwd())

from analysis.economic_impact import analyze_nagging_tax
from analysis.system_prompt_ablation import run_ablation_test
from reporting.generate_abstract import generate_abstract

def main():
    print("📄 STARTING PAPER STATS GENERATION...\n")
    
    # 1. Economic Analysis
    analyze_nagging_tax()
    
    # 2. Ablation Test
    run_ablation_test()
    
    # 3. Generate Abstract
    generate_abstract()
    
    print("\n🎉 PHASE 15 COMPLETE: Paper assets ready.")

if __name__ == "__main__":
    main()
