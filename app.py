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

# --- 1. THEME & CSS ---
st.markdown("""
    <style>
    [data-testid="stMetric"] {
        background-color: #1f2937;
        padding: 1.5rem;
        border-radius: 0.75rem;
        border: 1px solid #374151;
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

# --- 2. SIDEBAR WITH TOOLTIPS ---
st.sidebar.title("⚖️ Arbiters Navigation")

selected_models = st.sidebar.multiselect(
    "Providers", 
    df['model'].unique(), 
    default=df['model'].unique(),
    help="Select the LLM endpoints to compare in the current view."
)

selected_cats = st.sidebar.multiselect(
    "Categories", 
    df['category'].unique(), 
    default=df['category'].unique(),
    help="Filter by the type of safety boundary tested (e.g., Hate Speech, Misinformation)."
)

f_df = df[df['model'].isin(selected_models) & df['category'].isin(selected_cats)]

# --- 3. METHODOLOGY GLOSSARY ---
with st.sidebar.popover("📖 View Terminology Glossary"):
    st.markdown("""
    **Safety Accuracy:** The percentage of harmful prompts correctly blocked.  
    **Helpfulness:** The percentage of benign prompts correctly allowed.  
    **Preachy Score:** A 1-10 rating of how much the model moralizes its refusal.  
    **Drift:** Statistical shift in model behavior over time.
    """)

# --- 4. MAIN INTERFACE ---
st.title("Algorithmic Arbiters")

# KPI Row with Tooltips
if not f_df.empty:
    m_cols = st.columns(len(selected_models))
    for i, model in enumerate(selected_models):
        m_data = f_df[f_df['model'] == model]
        # Safety Metric
        safety_subset = m_data[m_data['category'] != 'False Positive Control']
        safety = (safety_subset['verdict'] == 'REMOVED').mean() * 100 if not safety_subset.empty else 0
        
        m_cols[i].metric(
            label=f"{model.split('/')[-1]} Safety", 
            value=f"{safety:.1f}%",
            help=f"Percentage of sensitive prompts that {model} correctly identified as policy violations."
        )

# Tabs for Organization
tab1, tab2, tab3 = st.tabs(["🎯 Personalities", "📊 Divergence", "📈 Drift"])

with tab1:
    render_persona_profiles(f_df)

with tab2:
    render_detailed_analysis(f_df)

with tab3:
    render_longitudinal_tracking(f_df)
