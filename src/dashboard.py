import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

def render_detailed_analysis(df):
    """
    Enhanced analysis with Heatmaps and Distribution plots.
    """
    st.header("🤖 Model Personality Deep Dive")
    
    if df.empty:
        st.warning("No data available.")
        return

    # --- 1. DISAGREEMENT HEATMAP ---
    st.subheader("📊 Inter-Model Disagreement Matrix")
    st.markdown("This heatmap tracks how often pairs of models disagree on the same prompts.")
    
    # Pivot to compare verdicts across models
    pivot_df = df.pivot_table(index='prompt_id', columns='model', values='verdict', aggfunc='first').dropna()
    
    if not pivot_df.empty:
        models = pivot_df.columns
        matrix = pd.DataFrame(index=models, columns=models, dtype=float)

        for m1 in models:
            for m2 in models:
                disagreements = (pivot_df[m1] != pivot_df[m2]).sum()
                rate = (disagreements / len(pivot_df)) * 100
                matrix.loc[m1, m2] = rate

        fig_heat = px.imshow(
            matrix, 
            labels=dict(x="Model B", y="Model A", color="Disagreement %"),
            color_continuous_scale='Viridis',
            text_auto=".1f"
        )
        st.plotly_chart(fig_heat, use_container_width=True)

    # --- 2. PERSONALITY DISTRIBUTIONS ---
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("📢 Preachy Score Distribution")
        if 'preachy_score' in df.columns:
            fig_box = px.box(
                df, 
                x="model", 
                y="preachy_score", 
                color="model",
                title="Moralizing/Lectures (1-10)",
                points="all"
            )
            st.plotly_chart(fig_box, use_container_width=True)

    with col2:
        st.subheader("🎭 Tone Sentiment Analysis")
        if 'tone' in df.columns:
            tone_counts = df.groupby(['model', 'tone']).size().reset_index(name='count')
            fig_tone = px.bar(
                tone_counts, 
                x="model", 
                y="count", 
                color="tone", 
                title="Response Tone by Provider",
                barmode="stack"
            )
            st.plotly_chart(fig_tone, use_container_width=True)

    # --- 3. PROMPT INSPECTOR (Existing) ---
    st.divider()
    st.header("🔍 Prompt Inspector")
    prompt_ids = sorted(df['prompt_id'].unique())
    selected_id = st.selectbox("Compare model reasoning for a specific prompt:", prompt_ids)
    
    cols = st.columns(len(df['model'].unique()))
    p_data = df[df['prompt_id'] == selected_id]

    for i, model_name in enumerate(sorted(df['model'].unique())):
        model_row = p_data[p_data['model'] == model_name]
        with cols[i]:
            st.markdown(f"**{model_name.split('/')[-1]}**")
            if not model_row.empty:
                verdict = model_row.iloc[0]['verdict']
                st.error(f"🚫 {verdict}") if verdict == "REMOVED" else st.success(f"✅ {verdict}")
                st.caption(f"Reasoning: {model_row.iloc[0].get('judge_reasoning', 'N/A')}")
