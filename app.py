import streamlit as st
import pandas as pd
import glob
import os
import plotly.express as px

st.set_page_config(page_title="LLM Moderation Tracker", layout="wide")

st.title("🛡️ LLM Content Moderation Analysis")
st.markdown("""
Track how different AI models act as content moderators over time. 
This dashboard now uses **Gemini 2.5 Flash** as a judge to provide high-accuracy verdicts.
""")

# --- Data Loading ---
@st.cache_data
def load_data():
    all_files = glob.glob("data/history/*.csv")
    if not all_files:
        return pd.DataFrame()
    
    df_list = [pd.read_csv(f) for f in all_files]
    full_df = pd.concat(df_list, ignore_index=True)
    
    # NEW LOGIC: Use the 'verdict' column directly from your new script.
    # If the column is missing (old data), it falls back to keyword matching.
    if 'verdict' not in full_df.columns:
        def get_verdict_fallback(text):
            if pd.isna(text): return "UNKNOWN"
            text = str(text).upper()
            if "REMOVED" in text: return "REMOVED"
            if "ALLOWED" in text: return "ALLOWED"
            return "UNCLEAR"
        full_df['verdict'] = full_df['response_text'].apply(get_verdict_fallback)
    
    return full_df

df = load_data()

if df.empty:
    st.warning("No data found in data/history/. Run your GitHub Action first!")
else:
    # --- Sidebar Filters ---
    st.sidebar.header("Filters")
    selected_models = st.sidebar.multiselect("Select Models", options=df['model'].unique(), default=df['model'].unique())
    filtered_df = df[df['model'].isin(selected_models)]

    # --- Charts ---
    # Metrics and Radar Chart logic remains the same...
    stats = filtered_df.groupby(['model', 'category'])['verdict'].apply(lambda x: (x == 'REMOVED').mean() * 100).reset_index(name='Removal Rate (%)')
    
    st.subheader("Model Moderation Personalities")
    fig_radar = px.line_polar(stats, r='Removal Rate (%)', theta='category', color='model', line_close=True, template="plotly_dark")
    fig_radar.update_traces(fill='toself')
    st.plotly_chart(fig_radar, use_container_width=True)

    # --- NEW: Integrated Deep Dive Section ---
    st.subheader("Explore Judgments & Reasoning")
    
    # This replaces the old simple dataframe display
    with st.expander("🔍 Deep Dive: View Judge Reasoning"):
        st.write("Examine the reasoning provided by the Judge (Gemini 2.5 Flash) for these decisions.")
        
        # We select only the most relevant columns for the deep dive
        cols_to_show = ['test_date', 'model', 'category', 'verdict']
        if 'judge_reasoning' in filtered_df.columns:
            cols_to_show.append('judge_reasoning')
        cols_to_show.append('response_text')
        
        st.dataframe(filtered_df[cols_to_show], use_container_width=True)
