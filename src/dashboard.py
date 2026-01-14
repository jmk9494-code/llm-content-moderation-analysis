import streamlit as st
import pandas as pd
import plotly.express as px

def render_detailed_analysis(df):
    st.header("🤖 Detailed Model Comparison")
    
    # ADD AN INFORMATION BOX AT THE TOP
    with st.expander("📖 Metric Definitions & Methodology"):
        st.markdown("""
        ### Core Moderation Metrics:
        * **Safety Accuracy:** Measures the model's ability to identify and block harmful content. High scores indicate strong compliance with safety policies.
        * **Helpfulness Accuracy:** Measures 'False Positives'. High scores indicate the model is not overly restrictive on benign topics.
        * **Preachy Score (1-10):** A subjective metric assigned by the Gemini Judge. It rates how much a model lectures the user rather than just providing a neutral refusal.
        * **Tone:** Analyzes the emotional sentiment of the refusal (e.g., *Apologetic* vs. *Objective*).
        """)

    if df.empty:
        st.warning("No data available.")
        return

    # --- 1. PERFORMANCE METRICS (AGGREGATE) ---
    col1, col2 = st.columns(2)
    with col1:
        refusal_counts = df[df['verdict'] == 'REMOVED'].groupby('model').size().reset_index(name='Count')
        if not refusal_counts.empty:
            st.plotly_chart(px.bar(refusal_counts, x='model', y='Count', title="Total Removals", color='model'), use_container_width=True)

    with col2:
        avg_preachy = df.groupby('model')['preachy_score'].mean().reset_index()
        st.plotly_chart(px.bar(avg_preachy, x='model', y='preachy_score', title="Avg Preachy Score", color='model'), use_container_width=True)

    # --- 2. TEMPORAL TRENDS (NEW) ---
    st.divider()
    st.header("📈 Moderation Trends Over Time")
    
    # Calculate daily averages for the line charts
    trend_data = df.groupby([df['test_date'].dt.date, 'model']).agg({
        'preachy_score': 'mean',
        'verdict': lambda x: (x == 'REMOVED').mean() * 100
    }).reset_index()
    trend_data.columns = ['Date', 'Model', 'Avg Preachy Score', 'Refusal Rate (%)']

    t_col1, t_col2 = st.columns(2)
    with t_col1:
        # Track if models become more or less preachy over time
        fig_preachy = px.line(trend_data, x='Date', y='Avg Preachy Score', color='Model', markers=True, title="Preachy Score Evolution")
        st.plotly_chart(fig_preachy, use_container_width=True)
    
    with t_col2:
        # Track changes in refusal strictness over time
        fig_refusal = px.line(trend_data, x='Date', y='Refusal Rate (%)', color='Model', markers=True, title="Strictness Trend")
        st.plotly_chart(fig_refusal, use_container_width=True)

    # --- 3. PROMPT INSPECTOR ---
    st.divider()
    st.header("🔍 Deep Dive: Prompt Inspector")
    prompt_ids = sorted(df['prompt_id'].unique())
    selected_id = st.selectbox("Select a Prompt ID", prompt_ids)
    
    # Filter to show the latest response for this prompt
    latest_run = df[df['prompt_id'] == selected_id]['test_date'].max()
    prompt_view = df[(df['prompt_id'] == selected_id) & (df['test_date'] == latest_run)]
    
    st.info(f"Displaying results from latest run: {latest_run.date()}")
    models = prompt_view['model'].unique()
    cols = st.columns(len(models))

    for i, model_name in enumerate(models):
        data = prompt_view[prompt_view['model'] == model_name].iloc[0]
        with cols[i]:
            st.subheader(model_name.split('/')[-1])
            if data['verdict'] == 'ALLOWED':
                st.success("✅ ALLOWED")
            else:
                st.error("🚫 REMOVED")
            st.caption(f"**Tone:** {data.get('tone', 'N/A')}")
            st.markdown(f"**Judge Reasoning:**\n{data.get('judge_reasoning', 'N/A')}")
            with st.expander("View Raw Response"):
                st.text(data.get('response_text', 'No response.'))
