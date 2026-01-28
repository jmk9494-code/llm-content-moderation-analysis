import os
import json
import glob
from datetime import datetime

HISTORY_DIR = "web/public/assets/history"
OUTPUT_HTML = "web/public/assets/drift.html"

def plot_drift():
    print("📈 Generating Safety Drift Chart (Client-Side)...")
    
    history_files = glob.glob(os.path.join(HISTORY_DIR, "traces_*.json"))
    if not history_files:
        print("⚠️  No history files found to plot.")
        return

    data_points = []
    
    for file_path in history_files:
        filename = os.path.basename(file_path)
        try:
            # Filename format: traces_YYYY-MM-DD.json
            date_str = filename.replace("traces_", "").replace(".json", "")
            
            with open(file_path, 'r') as f:
                traces = json.load(f)
                
            # Aggregate by model
            model_stats = {}
            for t in traces:
                model = str(t.get('model', 'Unknown'))
                if model == 'nan' or model == 'None':
                     model = 'Unknown'
                verdict = str(t.get('verdict', '')).upper()
                is_refusal = 1 if verdict in ['REMOVED', 'REFUSAL'] else 0
                
                if model not in model_stats:
                    model_stats[model] = {'count': 0, 'refusals': 0}
                
                model_stats[model]['count'] += 1
                model_stats[model]['refusals'] += is_refusal
                
            for model, stats in model_stats.items():
                rate = stats['refusals'] / stats['count'] if stats['count'] > 0 else 0
                data_points.append({
                    "date": date_str,
                    "model": model,
                    "refusal_rate": round(rate, 4)
                })
                
        except Exception as e:
            print(f"❌ Error processing {filename}: {e}")

    if not data_points:
        print("⚠️  No valid data extracted.")
        return

    # sort by date
    data_points.sort(key=lambda x: x['date'])

    # Organize for Plotly struct: traces per model
    # We need to pivot: models as keys, x=dates, y=rates
    models = sorted(list(set(d['model'] for d in data_points)))
    plot_traces = []
    
    for model in models:
        # Filter points for this model
        points = [d for d in data_points if d['model'] == model]
        # dates and rates
        x = [d['date'] for d in points]
        y = [d['refusal_rate'] for d in points]
        
        plot_traces.append({
            "x": x,
            "y": y,
            "type": "scatter",
            "mode": "lines+markers",
            "name": model
        })

    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Safety Drift Analysis</title>
    <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
    <style>body {{ font-family: sans-serif; margin: 0; padding: 20px; }}</style>
</head>
<body>
    <h2>🛡️ Safety Drift: Refusal Rate Over Time</h2>
    <div id="driftChart" style="width:100%;height:600px;"></div>
    <script>
        var traces = {json.dumps(plot_traces)};
        
        var layout = {{
            title: 'Refusal Rate by Model',
            xaxis: {{ title: 'Audit Date' }},
            yaxis: {{ title: 'Refusal Rate', tickformat: '.0%', range: [0, 1] }},
            hovermode: 'closest'
        }};
        
        Plotly.newPlot('driftChart', traces, layout);
    </script>
</body>
</html>"""

    with open(OUTPUT_HTML, 'w') as f:
        f.write(html_content)
    
    print(f"✅ Safety Drift Chart saved to {OUTPUT_HTML} with {len(data_points)} data points.")

if __name__ == "__main__":
    plot_drift()
