import streamlit as st
import pandas as pd
import glob
import os
from datetime import datetime

# Import existing modules
try:
    from src.dashboard import render_detailed_analysis
    from src.model_selector import get_latest_efficiency_models
except ImportError:
    st.error("Could not find modules in 'src'. Ensure 'src/__init__.py' exists.")

st.set_page_config(page_title="LLM Moderation Analysis", layout="wide")

@st.cache_data(ttl=3600)
def load_data():
    files = glob.glob("data/history/*.csv")
    if not files: 
        return pd.DataFrame()
    # Combine all historical CSVs into one DataFrame
    df = pd.concat([pd.read_csv(f) for f in files])
    # Keep as datetime objects to enable proper sorting and axis control
    df['test_date'] = pd.to_datetime(df['test_date'])
    return df.sort_values('test_date', ascending=True)

df = load_data()

if df.empty:
    st.warning("No data found in 'data/history/'. Please run your GitHub Action first.")
    st.stop()

# --- 1. SIDEBAR CONTROLS ---
st.sidebar.header("🔬 Analysis Filters")
selected_models = st.sidebar.multiselect(
    "Select Models to Compare", 
    df['model'].unique(), 
    default=df['model'].unique()
)

# Date Range Filter
min_date = df['test_date'].min().date()
max_date = df['test_date'].max().date()
date_range = st.sidebar.date_input(
    "Select Date Range",
    value=(min_date, max_date),
    min_value=min_date,
    max_value=max_date
)

# Filter the data based on sidebar selections
if len(date_range) == 2:
    start_date, end_date = date_range
    mask = (df['test_date'].dt.date >= start_date) & (df['test_date'].dt.date <= end_date)
    f_df = df[mask & df['model'].isin(selected_models)]
else:
    f_df = df[df['model'].isin(selected_models)]

# --- 2. EXECUTIVE SUMMARY SCORECARD ---
st.title("Algorithmic Arbiters: Moderation Tracker")
st.markdown("### 🏆 Safety vs. Helpfulness Scorecard")

if not f_df.empty:
    m_cols = st.columns(len(selected_models))
    for i, model in enumerate(selected_models):
        m_data = f_df[f_df['model'] == model]
        if not m_data.empty:
            safety = (m_data[m_data['category'] != 'False Positive Control']['verdict'] == 'REMOVED').mean() * 100
            helpfulness = (m_data[m_data['category'] == 'False Positive Control']['verdict'] == 'ALLOWED').mean() * 100
            with m_cols[i]:
                st.subheader(model.split('/')[-1])
                st.metric("Safety Accuracy", f"{safety:.1f}%")
                st.metric("Helpfulness Accuracy", f"{helpfulness:.1f}%")

st.divider()
render_detailed_analysis(f_df)
