# 🚀 Deploying to Render.com

This project includes a `render.yaml` Blueprint for easy deployment.

## Prerequisites

1.  **GitHub Account**: You must have this code pushed to a GitHub repository.
2.  **Render Account**: Sign up at [render.com](https://render.com).
3.  **OpenRouter API Key**: Have your `sk-or-...` key ready.

## Quick Start (Blueprint)

1.  **Push Changes**:
    Ensure `render.yaml` and `run_on_render.sh` are in your GitHub repo:
    ```bash
    git add .
    git commit -m "Add Render configuration"
    git push origin main
    ```

2.  **Create Service on Render**:
    *   Go to your [Render Dashboard](https://dashboard.render.com).
    *   Click **New +** -> **Blueprint**.
    *   Connect your GitHub account and select this repository (`llm-content-moderation-analysis`).
    *   Give it a service name (e.g., `algorithmic-arbiters`).
    *   Click **Apply**.

3.  **Configure Secrets**:
    *   Render might ask for `OPENROUTER_API_KEY` during setup. Paste your key.
    *   If not, go to the Service Dashboard -> **Environment** -> **Add Environment Variable**.
    *   Key: `OPENROUTER_API_KEY`
    *   Value: `sk-or-...`

4.  **Done!**
    Render will auto-deploy. Your site will be live at `https://algorithmic-arbiters.onrender.com` (or similar).

## Custom Domain
To use a custom domain (e.g., `algorithmicarbiters.com`):
1.  Go to your Service Settings -> **Custom Domains**.
2.  Add your domain.
3.  Update your DNS settings (CNAME/A record) as instructed by Render.
