import sys
import os

# MANDATORY: Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import streamlit as st
import pandas as pd
import glob
from datetime import datetime
from src.dashboard import (
    render_detailed_analysis, 
    render_persona_profiles, 
    render_longitudinal_tracking,
    render_cost_efficiency,
    apply_material_3_styling
)

# Initialize Material 3 App Config
st.set_page_config(
    page_title="Algorithmic Arbiters",
    page_icon="⚖️",
    layout="wide"
)

# Apply M3 styling (Injected from src/dashboard.py)
apply_material_3_styling()

@st.cache_data(ttl=3600)
def load_data():
    files = glob.glob("data/history/*.csv")
    if not files: return pd.DataFrame()
    df = pd.concat([pd.read_csv(f) for f in files])
    df['test_date'] = pd.to_datetime(df['test_date'])
    return df.sort_values('test_date')

df = load_data()

# --- 1. SIDEBAR NAVIGATION ---
st.sidebar.title("⚖️ Arbiters Navigation")

with st.sidebar.popover("📖 View Terminology Glossary"):
    st.markdown("""
    **Safety Accuracy:** Percentage of harmful prompts correctly blocked.  
    **Helpfulness:** Percentage of benign prompts correctly allowed.  
    **Preachy Score:** 1-10 rating of how much the model moralizes its refusal.  
    **Drift:** Statistical shift in model behavior over time.
    """)

st.sidebar.markdown("---")

selected_models = st.sidebar.multiselect(
    "Select Providers", 
    df['model'].unique(), 
    default=df['model'].unique(),
    help="Choose the LLM endpoints you want to compare."
)

selected_cats = st.sidebar.multiselect(
    "Select Categories", 
    df['category'].unique(), 
    default=df['category'].unique(),
    help="Filter results by the safety boundary tested."
)

f_df = df[df['model'].isin(selected_models) & df['category'].isin(selected_cats)]

st.sidebar.markdown("---")
st.sidebar.info(f"""
**Project:** Algorithmic Arbiters  
**Data Last Refreshed:** {df['test_date'].max().strftime('%Y-%m-%d')}  
**Institution:** University of Chicago (MLA)
""")

# --- 2. MAIN INTERFACE ---
st.title("Algorithmic Arbiters: Moderation Personality Tracker")

# Tabs for content organization
tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "🎯 Personalities", 
    "📊 Divergence", 
    "💰 Cost", 
    "📈 Drift", 
    "📥 Export"
])

with tab1:
    render_persona_profiles(f_df)

with tab2:
    render_detailed_analysis(f_df)

with tab3:
    render_cost_efficiency(f_df)

with tab4:
    # FIXED: No argument passed here to match the new M3 function signature
    render_longitudinal_tracking() 

with tab5:
    st.header("Data Repository")
    csv_data = f_df.to_csv(index=False).encode('utf-8')
    st.download_button("📥 Download Filtered Audit Log (CSV)", csv_data, "audit_log.csv", "text/csv")
    st.dataframe(f_df, use_container_width=True)
