import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import streamlit as st
import pandas as pd
import glob
from src.dashboard import (
    render_cost_efficiency, apply_material_3_styling,
    render_detailed_analysis, render_longitudinal_tracking
)

# Mandatory App Config
st.set_page_config(page_title="Algorithmic Arbiters", page_icon="⚖️", layout="wide")
apply_material_3_styling()

@st.cache_data(ttl=3600)
def load_data():
    files = glob.glob("data/history/*.csv")
    if not files: return pd.DataFrame()
    df = pd.concat([pd.read_csv(f) for f in files])
    df['test_date'] = pd.to_datetime(df['test_date'])
    return df.sort_values('test_date')

df = load_data()

# Navigation Rail (Sidebar)
st.sidebar.title("⚖️ Arbiters")
selected_models = st.sidebar.multiselect("Models", df['model'].unique(), default=df['model'].unique())
selected_cats = st.sidebar.multiselect("Categories", df['category'].unique(), default=df['category'].unique())
f_df = df[df['model'].isin(selected_models) & df['category'].isin(selected_cats)]

# Main Viewport Tabs
# Main Viewport Tabs
st.title("Algorithmic Arbiters")
tab2, tab3, tab4, tab5 = st.tabs(["📊 Audit", "💰 Cost", "📈 Drift", "📥 Data"])

with tab2: render_detailed_analysis(f_df)
with tab3: render_cost_efficiency(f_df)
with tab4: render_longitudinal_tracking() 
with tab5:
    st.header("Raw Audit Log")
    st.dataframe(f_df, use_container_width=True)
    st.download_button("Export Results (CSV)", f_df.to_csv(index=False).encode('utf-8'), "audit_log.csv")
