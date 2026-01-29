
import os
import shutil
import glob

# Source Directories
VISUALS_DIR = "visuals"
PAPER_FIGS_DIR = "paper/figures"

# Target Directory
PUBLIC_ASSETS_DIR = "web/public/assets"

def deploy_dashboard():
    print(f"Deploying Dashboard Assets to {PUBLIC_ASSETS_DIR}...")
    
    # Ensure target directory exists
    os.makedirs(PUBLIC_ASSETS_DIR, exist_ok=True)
    
    # Define Copy Mapping (Source -> Destination Filename)
    assets_map = {
        os.path.join(VISUALS_DIR, "pareto_alignment.html"): "pareto.html",
        os.path.join(VISUALS_DIR, "semantic_clusters.html"): "clusters.html",
        os.path.join(PAPER_FIGS_DIR, "trigger_cloud.png"): "wordcloud.png",
        # PDF handling for heatmap
        os.path.join(PAPER_FIGS_DIR, "censorship_fingerprint.pdf"): "heatmap.pdf", 
    }
    
    success_count = 0
    
    for src_path, dest_filename in assets_map.items():
        if os.path.exists(src_path):
            dest_path = os.path.join(PUBLIC_ASSETS_DIR, dest_filename)
            try:
                shutil.copy2(src_path, dest_path)
                print(f"✅ Copied: {src_path} -> {dest_filename}")
                success_count += 1
            except Exception as e:
                print(f"❌ Error copying {src_path}: {e}")
        else:
            print(f"⚠️ Warning: Source file missing: {src_path}")
            
    print(f"\nDeployment Complete. {success_count}/{len(assets_map)} assets transferred.")
    
    # Generate traces.json for Evidence Locker & Performance
    try:
        import pandas as pd
        csv_path = "web/public/audit_log.csv"
        if os.path.exists(csv_path):
            print("🔄 Generating traces.json from audit_log.csv...")
            df = pd.read_csv(csv_path)
            # Ensure consistency with data-loading.ts expectations
            # (Timestamp, model, etc. are standard in audit_log.csv)
            json_path = os.path.join(PUBLIC_ASSETS_DIR, "traces.json")
            df.to_json(json_path, orient="records")
            print(f"✅ Generated {json_path}")
        else:
            print(f"⚠️ Warning: {csv_path} not found. Skipping traces.json generation.")
    except ImportError:
        print("⚠️ Warning: pandas not installed. Skipping traces.json generation.")
    except Exception as e:
        print(f"❌ Error generating traces.json: {e}")

    print("Dashboard available at: web/public/deep_dive.html")

if __name__ == "__main__":
    deploy_dashboard()
