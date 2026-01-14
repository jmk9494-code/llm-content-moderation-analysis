import sys
import os

# MANDATORY: Add the project root to the Python path for Streamlit Cloud compatibility
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import streamlit as st
import pandas as pd
import glob
from datetime import datetime
from src.dashboard import render_detailed_analysis, render_persona_profiles, render_longitudinal_tracking

st.set_page_config(
    page_title="Algorithmic Arbiters Dashboard",
    page_icon="⚖️",
    layout="wide"
)

# --- 1. CUSTOM CSS FOR NAVIGATION & METRICS ---
st.markdown("""
    <style>
    /* Metric Card Styling */
    [data-testid="stMetric"] {
        background-color: #1f2937;
        padding: 1.5rem;
        border-radius: 0.75rem;
        border: 1px solid #374151;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    /* Sidebar Polish */
    section[data-testid="stSidebar"] {
        background-color: #111827;
        border-right: 1px solid #1f2937;
    }
    </style>
    """, unsafe_allow_html=True)

@st.cache_data(ttl=3600)
def load_data():
    files = glob.glob("data/history/*.csv")
    if not files: return pd.DataFrame()
    df = pd.concat([pd.read_csv(f) for f in files])
    df['test_date'] = pd.to_datetime(df['test_date'])
    return df.sort_values('test_date')

df = load_data()

# --- 2. ENHANCED SIDEBAR NAVIGATION ---
st.sidebar.title("⚖️ Arbiters Navigation")

# Glossary Popover to explain technical terms without cluttering the UI
with st.sidebar.popover("📖 View Terminology Glossary"):
    st.markdown("""
    **Safety Accuracy:** Percentage of harmful prompts correctly blocked.  
    **Helpfulness:** Percentage of benign prompts correctly allowed.  
    **Preachy Score:** 1-10 rating of how much the model moralizes its refusal.  
    **Drift:** Statistical shift in model behavior over time.
    """)

st.sidebar.markdown("---")

# Multiselect with Tooltips (using the 'help' parameter)
selected_models = st.sidebar.multiselect(
    "Select Providers", 
    df['model'].unique(), 
    default=df['model'].unique(),
    help="Choose the LLM endpoints you want to compare in this audit session."
)

selected_cats = st.sidebar.multiselect(
    "Select Categories", 
    df['category'].unique(), 
    default=df['category'].unique(),
    help="Filter results by the safety boundary tested (e.g., Hate Speech, Misinformation)."
)

f_df = df[df['model'].isin(selected_models) & df['category'].isin(selected_cats)]

# Footer branding in sidebar
st.sidebar.markdown("---")
st.sidebar.info(f"""
**Project:** Algorithmic Arbiters  
**Data Last Refreshed:** {df['test_date'].max().strftime('%Y-%m-%d')}  
**Institution:** University of Chicago (MLA)
""")

# --- 3. MAIN INTERFACE ---
st.title("Algorithmic Arbiters: Moderation Personality Tracker")

# Tabs for content organization
tab1, tab2, tab3, tab4 = st.tabs(["🎯 Personalities", "📊 Divergence", "📈 Drift", "📥 Export"])

with tab1:
    render_persona_profiles(f_df) # Determined by Preachy scores and Judge Reasoning

with tab2:
    render_detailed_analysis(f_df) # Includes Disagreement Matrix and Prompt Inspector

with tab3:
    render_longitudinal_tracking(f_df) # Visualizes stability over time

with tab4:
    st.header("Data Repository")
    csv_data = f_df.to_csv(index=False).encode('utf-8')
    st.download_button("📥 Download Filtered Audit Log (CSV)", csv_data, "audit_log.csv", "text/csv")
    st.dataframe(f_df, use_container_width=True)
