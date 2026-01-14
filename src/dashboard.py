import streamlit as st
import pandas as pd
import plotly.express as px
import os

st.set_page_config(page_title="LLM Moderator", page_icon="⚖️", layout="wide")

@st.cache_data
def load_data():
    path = os.path.join(os.path.dirname(__file__), '..', 'data', 'model_responses_v3.csv')
    if not os.path.exists(path): return pd.DataFrame()
    return pd.read_csv(path)

df = load_data()

st.title("🤖 Algorithmic Arbiters")
st.markdown("Compare how **Gemini, GPT, Claude, Llama, and Grok** moderate content.")

if df.empty:
    st.warning("No data found. Run `src/collect_model_responses.py` first.")
    st.stop()

# --- METRICS ---
col1, col2 = st.columns(2)
with col1:
    refusal_counts = df[df['Verdict'] == 'REMOVED'].groupby('Model').size().reset_index(name='Count')
    fig = px.bar(refusal_counts, x='Model', y='Count', title="Total Content Removals", color='Model')
    st.plotly_chart(fig, use_container_width=True)

# --- PROMPT VIEWER ---
st.divider()
st.header("🔍 Inspect Specific Prompts")

prompt_id = st.selectbox("Select Prompt ID", df['Prompt_ID'].unique())
row = df[df['Prompt_ID'] == prompt_id].iloc[0]

st.info(f"**Prompt Text:** {row['Prompt_Text']}")

# Dynamic Grid for Models
models = df[df['Prompt_ID'] == prompt_id]['Model'].unique()
cols = st.columns(len(models))

for i, model in enumerate(models):
    data = df[(df['Prompt_ID'] == prompt_id) & (df['Model'] == model)].iloc[0]
    with cols[i]:
        clean_name = model.split('/')[-1]
        st.subheader(clean_name)
        if data['Verdict'] == 'ALLOWED':
            st.success("ALLOWED")
        else:
            st.error("REMOVED")
        st.caption(data['Reasoning'])
