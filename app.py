import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import streamlit as st
import pandas as pd
import glob
from src.ui import inject_m3_style
from src.dashboard import (
    render_summary_metrics, render_cost_efficiency,
    render_detailed_analysis, render_longitudinal_tracking
)

# Mandatory App Config
st.set_page_config(page_title="Algorithmic Arbiters", page_icon="⚖️", layout="wide")

# Inject Global Material 3 CSS
inject_m3_style()

@st.cache_data(ttl=3600)
def load_data():
    files = glob.glob("data/history/*.csv")
    # Also include the latest batch if available
    if os.path.exists("audit_log.csv"):
        files.append("audit_log.csv")
        
    if not files: return pd.DataFrame()
    
    dfs = []
    for f in files:
        try:
            df_temp = pd.read_csv(f)
            if not df_temp.empty:
                dfs.append(df_temp)
        except: pass
        
    if not dfs: return pd.DataFrame()
    
    df = pd.concat(dfs)
    if 'test_date' in df.columns:
        df['test_date'] = pd.to_datetime(df['test_date'])
        return df.sort_values('test_date', ascending=False)
    return df

try:
    df = load_data()
except Exception as e:
    st.error(f"Error loading data: {e}")
    df = pd.DataFrame()

# Navigation Rail (Sidebar)
st.sidebar.markdown("## ⚖️ Config")
if not df.empty:
    selected_models = st.sidebar.multiselect("Models", df['model'].unique(), default=df['model'].unique())
    selected_cats = st.sidebar.multiselect("Categories", df['category'].unique(), default=df['category'].unique())
    f_df = df[df['model'].isin(selected_models) & df['category'].isin(selected_cats)]
else:
    f_df = pd.DataFrame()

# Main Viewport
st.title("Algorithmic Arbiters")
st.markdown("##### Longitudinal Analysis of AI Content Moderation")

if f_df.empty:
    st.info("No data available. Run an audit to populate.")
    st.stop()

# Render Top-Level Metrics
render_summary_metrics(f_df)

# AI Analyst Report Section
report_path = "data/latest_report.md"
if os.path.exists(report_path):
    with st.expander("📝 Latest Executive Summary", expanded=True):
        with open(report_path, "r") as f:
            st.markdown(f.read())

st.markdown("---")

# Tab Layout
tab1, tab2, tab3, tab4 = st.tabs(["📈 Drift", "📊 Analysis", "💰 Efficiency", "📥 Raw Data"])

with tab1: render_longitudinal_tracking()
with tab2: render_detailed_analysis(f_df)
with tab3: render_cost_efficiency(f_df)
with tab4:
    st.dataframe(f_df, use_container_width=True)
    csv = f_df.to_csv(index=False).encode('utf-8')
    st.download_button("Download CSV", csv, "audit_data.csv", "text/csv")
