
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
    print("Dashboard available at: web/public/deep_dive.html")

if __name__ == "__main__":
    deploy_dashboard()
