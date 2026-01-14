import streamlit as st
import pandas as pd
import glob
from datetime import datetime
from src.dashboard import render_detailed_analysis, render_persona_profiles, render_longitudinal_tracking

st.set_page_config(
    page_title="Algorithmic Arbiters Dashboard",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- 1. CUSTOM CSS FOR STYLING ---
st.markdown("""
    <style>
    /* Metric Card Styling */
    [data-testid="stMetric"] {
        background-color: #1f2937;
        padding: 1.5rem;
        border-radius: 0.75rem;
        border: 1px solid #374151;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    /* Main Background */
    .main {
        background-color: #0e1117;
    }
    /* Sidebar Styling */
    section[data-testid="stSidebar"] {
        background-color: #111827;
        border-right: 1px solid #1f2937;
    }
    /* Header Polish */
    h1, h2, h3 {
        color: #fafafa;
        font-weight: 700;
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
    st.warning("No data found. Please run the collection script first.")
    st.stop()

# --- 2. SIDEBAR NAVIGATION ---
st.sidebar.title("⚖️ Arbiters Navigation")
st.sidebar.markdown("---")

# Filters
selected_models = st.sidebar.multiselect(
    "Providers", df['model'].unique(), default=df['model'].unique()
)
selected_cats = st.sidebar.multiselect(
    "Categories", df['category'].unique(), default=df['category'].unique()
)

f_df = df[df['model'].isin(selected_models) & df['category'].isin(selected_cats)]

# Footer
st.sidebar.markdown("---")
st.sidebar.info(f"""
**Project:** Algorithmic Arbiters  
**Last Run:** {df['test_date'].max().strftime('%Y-%m-%d')}  
**Tests Recorded:** {len(df)}
""")

# --- 3. MAIN INTERFACE ---
st.title("Algorithmic Arbiters: Moderation Personality Tracker")
st.markdown("Automated auditing of safety and political bias in Large Language Models.")

# KPI Row (Top Metrics)
if not f_df.empty:
    m_cols = st.columns(len(selected_models))
    for i, model in enumerate(selected_models):
        m_data = f_df[f_df['model'] == model]
        safety = (m_data[m_data['category'] != 'False Positive Control']['verdict'] == 'REMOVED').mean() * 100
        m_cols[i].metric(label=f"{model.split('/')[-1]} Safety", value=f"{safety:.1f}%")

# Main Content Tabs
tab1, tab2, tab3, tab4 = st.tabs([
    "🎯 Persona Profiles", 
    "📊 Comparative Analysis", 
    "📈 Drift Tracking", 
    "📥 Data Export"
])

with tab1:
    render_persona_profiles(f_df)

with tab2:
    render_detailed_analysis(f_df)

with tab3:
    render_longitudinal_tracking(f_df)

with tab4:
    st.header("Data Repository")
    csv_data = f_df.to_csv(index=False).encode('utf-8')
    st.download_button(
        label="📥 Download Filtered Audit Log (CSV)",
        data=csv_data,
        file_name=f"audit_log_{datetime.now().strftime('%Y%m%d')}.csv",
        mime="text/csv",
        use_container_width=True
    )
    st.dataframe(f_df, use_container_width=True)
