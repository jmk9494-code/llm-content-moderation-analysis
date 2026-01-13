import streamlit as st
import pandas as pd
import glob
import os
import plotly.express as px
import plotly.graph_objects as go

st.set_page_config(page_title="LLM Moderation Tracker", layout="wide")

# --- Title and Intro ---
st.title("🛡️ LLM Content Moderation Analysis")
st.markdown("""
Track how different AI models act as content moderators over time. 
This dashboard visualizes which categories each model is most sensitive to.
""")

# --- Data Loading ---
@st.cache_data
def load_data():
    # Find all CSVs in the history folder
    all_files = glob.glob("data/history/*.csv")
    if not all_files:
        return pd.DataFrame()
    
    df_list = [pd.read_csv(f) for f in all_files]
    full_df = pd.concat(df_list, ignore_index=True)
    
    # Simple logic to determine the verdict: Look for "REMOVED" in the response
    def get_verdict(text):
        if pd.isna(text): return "UNKNOWN"
        text = str(text).upper()
        if "REMOVED" in text: return "REMOVED"
        if "ALLOWED" in text: return "ALLOWED"
        return "UNCLEAR"

    full_df['verdict'] = full_df['response_text'].apply(get_verdict)
    return full_df

df = load_data()

if df.empty:
    st.warning("No data found in data/history/. Run your GitHub Action first!")
else:
    # --- Sidebar Filters ---
    st.sidebar.header("Filters")
    selected_models = st.sidebar.multiselect("Select Models", options=df['model'].unique(), default=df['model'].unique())
    
    filtered_df = df[df['model'].isin(selected_models)]

    # --- Metrics: Permissiveness Score ---
    # Calculate % removed per category per model
    stats = filtered_df.groupby(['model', 'category'])['verdict'].apply(lambda x: (x == 'REMOVED').mean() * 100).reset_index(name='Removal Rate (%)')

    # --- Radar Chart (The "Personality" Chart) ---
    st.subheader("Model Moderation Personalities")
    st.info("Higher percentage means the model is more likely to REMOVE content in that category.")
    
    fig_radar = px.line_polar(
        stats, r='Removal Rate (%)', theta='category', color='model',
        line_close=True, template="plotly_dark",
        labels={'Removal Rate (%)': 'Strictness Score'}
    )
    fig_radar.update_traces(fill='toself')
    st.plotly_chart(fig_radar, use_container_width=True)

    # --- Trend Over Time ---
    st.subheader("Strictness Over Time")
    trend_data = filtered_df.groupby(['test_date', 'model'])['verdict'].apply(lambda x: (x == 'REMOVED').mean() * 100).reset_index(name='Avg Strictness')
    
    fig_trend = px.line(trend_data, x='test_date', y='Avg Strictness', color='model', markers=True)
    st.plotly_chart(fig_trend, use_container_width=True)

    # --- Raw Data Search ---
    st.subheader("Explore Raw Responses")
    st.dataframe(filtered_df[['test_date', 'model', 'category', 'verdict', 'response_text']])
