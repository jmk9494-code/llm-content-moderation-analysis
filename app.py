import streamlit as st
import pandas as pd
import plotly.express as px
from sklearn.metrics import cohen_kappa_score

def get_kappa_label(k):
    """
    Returns a qualitative label for the Cohen's Kappa score based on standard benchmarks.
    """
    if k < 0: return "Poor"
    if k <= 0.2: return "Slight"
    if k <= 0.4: return "Fair"
    if k <= 0.6: return "Moderate"
    if k <= 0.8: return "Substantial"
    return "Almost Perfect"

def calculate_agreement(df):
    """
    Calculates and displays the Cohen's Kappa agreement between the AI Judge and the Expected Verdict.
    """
    st.header("🤝 Inter-rater Agreement (Cohen's Kappa)")
    st.markdown("Measures agreement between the **AI Judge** and your **Expected Verdict**, accounting for chance.")
    
    if 'model' not in df.columns or 'expected_verdict' not in df.columns or 'verdict' not in df.columns:
        st.warning("Agreement columns (model, expected_verdict, verdict) are missing from the data.")
        return

    for model in df['model'].unique():
        # Drop rows where either verdict is missing to ensure valid calculation
        m_data = df[df['model'] == model].dropna(subset=['expected_verdict', 'verdict'])
        
        if not m_data.empty:
            try:
                kappa = cohen_kappa_score(m_data['expected_verdict'], m_data['verdict'])
                label = get_kappa_label(kappa)
                st.write(f"**{model.split('/')[-1]}:** {kappa:.2f} (Strength: {label})")
            except Exception as e:
                st.error(f"Could not calculate Kappa for {model}: {e}")

def render_detailed_analysis(df):
    """
    Renders detailed analysis, charts, and agreement metrics. Called by app.py.
    """
    st.header("🤖 Detailed Model Comparison")
    
    if df.empty:
        st.warning("No data available for the selected models.")
        return

    # --- 1. PERFORMANCE METRICS ---
    col1, col2 = st.columns(2)
    
    with col1:
        # Aggregate removals by model
        if 'verdict' in df.columns and 'model' in df.columns:
            refusal_counts = df[df['verdict'] == 'REMOVED'].groupby('model').size().reset_index(name='Count')
            if not refusal_counts.empty:
                fig = px.bar(
                    refusal_counts, 
                    x='model', 
                    y='Count', 
                    title="Total Content Removals", 
                    color='model'
                )
                st.plotly_chart(fig, use_container_width=True)

    with col2:
        # Preachy Score Analysis
        if 'preachy_score' in df.columns:
            avg_preachy = df.groupby('model')['preachy_score'].mean().reset_index()
            fig_preachy = px.bar(
                avg_preachy, 
                x='model', 
                y='preachy_score', 
                title="Average 'Preachy' Score (1-10)",
                color='model'
            )
            st.plotly_chart(fig_preachy, use_container_width=True)

    # --- 2. AGREEMENT ANALYSIS ---
    st.divider()
    calculate_agreement(df)

    # --- 3. PROMPT INSPECTOR ---
    st.divider()
    st.header("🔍 Deep Dive: Prompt Inspector")

    if 'prompt_id' in df.columns:
        prompt_ids = sorted(df['prompt_id'].unique())
        selected_id = st.selectbox("Select a Prompt ID to compare responses", prompt_ids)
        
        # Display metadata for the selected prompt
        prompt_data = df[df['prompt_id'] == selected_id].iloc[0]
        st.info(f"**Inspecting Prompt ID:** {selected_id}")

        # Create columns for each model tested for this prompt
        models = df[df['prompt_id'] == selected_id]['model'].unique()
        cols = st.columns(len(models))

        for i, model_name in enumerate(models):
            data = df[(df['prompt_id'] == selected_id) & (df['model'] == model_name)].iloc[0]
            with cols[i]:
                st.subheader(model_name.split('/')[-1])
                
                if data['verdict'] == 'ALLOWED':
                    st.success("✅ ALLOWED")
                else:
                    st.error("🚫 REMOVED")
                
                st.caption(f"**Tone:** {data.get('tone', 'N/A')}")
                st.markdown(f"**Judge Reasoning:**\n{data.get('judge_reasoning', 'N/A')}")
                
                with st.expander("View Raw Response"):
                    st.text(data.get('response_text', 'No response recorded.'))
