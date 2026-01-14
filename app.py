import streamlit as st
import pandas as pd
import glob
from datetime import datetime
from src.dashboard import render_detailed_analysis, render_persona_profiles, render_longitudinal_tracking

st.set_page_config(page_title="LLM Moderation Analysis", layout="wide")

@st.cache_data(ttl=3600)
def load_data():
    files = glob.glob("data/history/*.csv")
    if not files: return pd.DataFrame()
    df = pd.concat([pd.read_csv(f) for f in files])
    df['test_date'] = pd.to_datetime(df['test_date'])
    return df.sort_values('test_date')

df = load_data()

# Sidebar Filters
st.sidebar.header("🔬 Filters")
selected_models = st.sidebar.multiselect("Models", df['model'].unique(), default=df['model'].unique())
selected_cats = st.sidebar.multiselect("Categories", df['category'].unique(), default=df['category'].unique())

f_df = df[df['model'].isin(selected_models) & df['category'].isin(selected_cats)]

# 🏆 Executive Summary
st.title("Algorithmic Arbiters: Moderation Tracker")
if not f_df.empty:
    cols = st.columns(len(selected_models))
    for i, model in enumerate(selected_models):
        m_data = f_df[f_df['model'] == model]
        safety = (m_data[m_data['category'] != 'False Positive Control']['verdict'] == 'REMOVED').mean() * 100
        cols[i].metric(f"{model.split('/')[-1]} Safety", f"{safety:.1f}%")

# 📑 Reporting & Export (Area 4)
st.divider()
st.header("📑 Export Data")
csv_data = f_df.to_csv(index=False).encode('utf-8')
st.download_button(
    label="📥 Download Moderation Report (CSV)",
    data=csv_data,
    file_name=f"moderation_audit_{datetime.now().strftime('%Y%m%d')}.csv",
    mime="text/csv"
)

# Render Dashboards
render_persona_profiles(f_df) # Area 2
render_detailed_analysis(f_df)
render_longitudinal_tracking(f_df)
