import streamlit as st
import pandas as pd
import plotly.express as px

def render_detailed_analysis(df):
    """
    Renders detailed analysis and charts. Called by app.py.
    """
    st.header("🤖 Detailed Model Comparison")
    
    if df.empty:
        st.warning("No data available for the selected models.")
        return

    # --- 1. PERFORMANCE METRICS ---
    col1, col2 = st.columns(2)
    
    with col1:
        # Aggregate removals by model using lowercase column names from results CSVs
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

    # --- 2. PROMPT INSPECTOR ---
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
