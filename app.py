import sys
import os

# MANDATORY: Add the project root to the Python path for Streamlit Cloud compatibility
# This ensures that 'from src.dashboard import ...' works correctly.
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import streamlit as st
import pandas as pd
import glob
from datetime import datetime

# Import dashboard functions from the src directory
try:
    from src.dashboard import render_detailed_analysis, render_persona_profiles, render_longitudinal_tracking
except ImportError as e:
    st.error(f"Failed to import dashboard functions: {e}")
    st.stop()

st.set_page_config(
    page_title="Algorithmic Arbiters Dashboard",
    page_icon="⚖️",
    layout="wide"
)

# Custom CSS for modern Metric Cards
st.markdown("""
    <style>
    [data-testid="stMetric"] {
        background-color: #1f2937;
        padding: 1.5rem;
        border-radius: 0.75rem;
        border: 1px solid #374151;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    </style>
    """, unsafe_allow_html=True)

@st.cache_data(ttl=3600)
def load_data():
    """Combines historical CSV results from the data/history directory."""
    files = glob.glob("data/history/*.csv")
    if not files: 
        return pd.DataFrame()
    df = pd.concat([pd.read_csv(f) for f in files])
    df['test_date'] = pd.to_datetime(df['test_date'])
    return df.sort_values('test_date', ascending=True)

df = load_data()

if df.empty:
    st.warning("No data found in 'data/history/'. Ensure your GitHub Action has run.")
    st.stop()

# --- SIDEBAR CONTROLS ---
st.sidebar.title("⚖️ Navigation")

selected_models = st.sidebar.multiselect(
    "Select Providers", 
    df['model'].unique(), 
    default=df['model'].unique(),
    help="Filter the view to specific LLM endpoints."
)

selected_cats = st.sidebar.multiselect(
    "Select Categories", 
    df['category'].unique(), 
    default=df['category'].unique(),
    help="Filter by safety boundary tested."
)

f_df = df[df['model'].isin(selected_models) & df['category'].isin(selected_cats)]

# --- MAIN INTERFACE ---
st.title("Algorithmic Arbiters: Moderation Personality Tracker")

# 1. Executive Scorecard
if not f_df.empty:
    m_cols = st.columns(len(selected_models))
    for i, model in enumerate(selected_models):
        m_data = f_df[f_df['model'] == model]
        # Safety: % of harmful prompts blocked
        safety_subset = m_data[m_data['category'] != 'False Positive Control']
        safety = (safety_subset['verdict'] == 'REMOVED').mean() * 100 if not safety_subset.empty else 0
        
        m_cols[i].metric(
            label=f"{model.split('/')[-1]} Safety", 
            value=f"{safety:.1f}%",
            help="Percentage of harmful prompts correctly blocked."
        )

# 2. Navigation Tabs
tab1, tab2, tab3, tab4 = st.tabs(["🎯 Personalities", "📊 Divergence", "📈 Drift", "📥 Export"])

with tab1:
    render_persona_profiles(f_df)

with tab2:
    render_detailed_analysis(f_df)

with tab3:
    render_longitudinal_tracking(f_df)

with tab4:
    st.header("Data Repository")
    csv_data = f_df.to_csv(index=False).encode('utf-8')
    st.download_button("📥 Download Filtered Audit Log (CSV)", csv_data, "audit_log.csv", "text/csv")
    st.dataframe(f_df, use_container_width=True)
