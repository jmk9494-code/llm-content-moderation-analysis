import streamlit as st
import pandas as pd
import glob
import os
from datetime import datetime

try:
    from src.dashboard import render_detailed_analysis
    from src.model_selector import get_latest_efficiency_models
except ImportError:
    st.error("Could not find modules in 'src'. Ensure 'src/__init__.py' exists.")

st.set_page_config(page_title="LLM Moderation Analysis", layout="wide")

@st.cache_data(ttl=3600)
def load_data():
    """
    Combines historical CSV results from the data/history directory.
    """
    files = glob.glob("data/history/*.csv")
    if not files: 
        return pd.DataFrame()
    df = pd.concat([pd.read_csv(f) for f in files])
    df['test_date'] = pd.to_datetime(df['test_date'])
    return df.sort_values('test_date', ascending=True)

df = load_data()

if df.empty:
    st.warning("No data found in 'data/history/'. Please run your collection script first.")
    st.stop()

# --- 1. SIDEBAR CONTROLS ---
st.sidebar.header("🔬 Analysis Filters")

# Model Selection
selected_models = st.sidebar.multiselect(
    "Select Models to Compare", 
    df['model'].unique(), 
    default=df['model'].unique()
)

# Category Selection
selected_categories = st.sidebar.multiselect(
    "Select Categories", 
    df['category'].unique(), 
    default=df['category'].unique()
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

# Apply Filter Logic
if len(date_range) == 2:
    start_date, end_date = date_range
    mask = (
        (df['test_date'].dt.date >= start_date) & 
        (df['test_date'].dt.date <= end_date) &
        (df['model'].isin(selected_models)) &
        (df['category'].isin(selected_categories))
    )
    f_df = df[mask]
else:
    f_df = df[df['model'].isin(selected_models) & df['category'].isin(selected_categories)]

# --- 2. EXECUTIVE SUMMARY SCORECARD ---
st.title("Algorithmic Arbiters: Moderation Tracker")
st.markdown("### 🏆 Safety vs. Helpfulness Scorecard")

if not f_df.empty:
    m_cols = st.columns(len(selected_models))
    for i, model in enumerate(selected_models):
        m_data = f_df[f_df['model'] == model]
        if not m_data.empty:
            # Safety Accuracy: Percentage of harmful prompts correctly rejected.
            safety_subset = m_data[m_data['category'] != 'False Positive Control']
            safety = (safety_subset['verdict'] == 'REMOVED').mean() * 100 if not safety_subset.empty else 0
            
            # Helpfulness Accuracy: Percentage of benign control prompts correctly allowed.
            help_subset = m_data[m_data['category'] == 'False Positive Control']
            helpfulness = (help_subset['verdict'] == 'ALLOWED').mean() * 100 if not help_subset.empty else 0
            
            with m_cols[i]:
                st.subheader(model.split('/')[-1])
                st.metric(
                    "Safety Accuracy", 
                    f"{safety:.1f}%", 
                    help="Percentage of 'Harmful' prompts correctly REJECTED by the model."
                )
                st.metric(
                    "Helpfulness Accuracy", 
                    f"{helpfulness:.1f}%", 
                    help="Percentage of 'Benign' control prompts correctly ALLOWED by the model."
                )

# Sidebar Branding
st.sidebar.divider()
st.sidebar.info("""
**Project:** Algorithmic Arbiters  
**Author:** Jacob Kandel  
**Institution:** University of Chicago  
*This dashboard tracks the political and safety biases of top LLM providers over time.*
""")

st.divider()

# --- 3. DETAILED ANALYSIS ---
render_detailed_analysis(f_df)
