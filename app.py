import streamlit as st
import pandas as pd
import glob
import plotly.express as px
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

st.set_page_config(page_title="LLM Moderation Analysis", layout="wide")

@st.cache_data(ttl=3600)
def load_data():
    files = glob.glob("data/history/*.csv")
    if not files: return pd.DataFrame()
    df = pd.concat([pd.read_csv(f) for f in files])
    df['test_date'] = pd.to_datetime(df['test_date']).dt.date
    return df.sort_values('test_date', ascending=False)

df = load_data()
if df.empty: st.stop()

# --- 1. EXECUTIVE SUMMARY ---
st.header("🏆 Model Alignment Scorecard")
selected_models = st.multiselect("Filter Models", df['model'].unique(), default=df['model'].unique())
f_df = df[df['model'].isin(selected_models)]

m_cols = st.columns(len(selected_models))
for i, model in enumerate(selected_models):
    m_data = f_df[f_df['model'] == model]
    safety = (m_data[m_data['category'] != 'False Positive Control']['verdict'] == 'REMOVED').mean() * 100
    helpfulness = (m_data[m_data['category'] == 'False Positive Control']['verdict'] == 'ALLOWED').mean() * 100
    with m_cols[i]:
        st.metric(model.split('/')[-1], f"S: {safety:.0f}%", f"H: {helpfulness:.0f}%")

# --- 2. THE DUEL & SIMILARITY ---
st.divider()
st.subheader("⚔️ Semantic Similarity Duel")
col_a, col_b = st.columns(2)
with col_a: m_a = st.selectbox("Model A", selected_models, index=0)
with col_b: m_b = st.selectbox("Model B", selected_models, index=min(1, len(selected_models)-1))

p_id = st.selectbox("Compare Prompt ID", f_df['prompt_id'].unique())
res_a = f_df[(f_df['model'] == m_a) & (f_df['prompt_id'] == p_id)].iloc[0]
res_b = f_df[(f_df['model'] == m_b) & (f_df['prompt_id'] == p_id)].iloc[0]

# Math: Cosine Similarity
vect = TfidfVectorizer().fit_transform([res_a['response_text'], res_b['response_text']])
sim = (vect * vect.T).toarray()[0,1]
st.center(st.metric("Semantic Similarity", f"{sim:.2f}"))

# --- 3. PREACHINESS vs COST ---
st.divider()
st.subheader("💰 The 'Cost of Preaching' Analysis")
fig_scatter = px.scatter(f_df, x="preachy_score", y="run_cost", color="model", 
                         hover_data=['prompt_id'], title="Preachiness vs. Cost")
st.plotly_chart(fig_scatter, use_container_width=True)

# --- 4. LATEX EXPORTER ---
st.divider()
st.subheader("📄 Thesis Export Tool")
if st.button("Generate LaTeX Code"):
    summary = f_df.groupby('model').agg({
        'verdict': lambda x: (x == 'REMOVED').mean() * 100,
        'preachy_score': 'mean',
        'run_cost': 'sum'
    }).rename(columns={'verdict': 'Removal %', 'preachy_score': 'Avg Preachy', 'run_cost': 'Total Cost ($)'})
    st.code(summary.to_latex(float_format="%.2f"), language="latex")
