import streamlit as st
import pandas as pd
import plotly.express as px

def render_detailed_analysis(df):
    """
    Renders the detailed charts and prompt inspector for the moderation analysis.
    This function is called by app.py and receives the filtered dataframe.
    """
    st.header("🤖 Detailed Model Comparison")
    
    if df.empty:
        st.warning("No data available for the selected models. Please check your sidebar filters.")
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
                    color='model',
                    template="plotly_white"
                )
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("No removals found in the current selection.")

    with col2:
        # Preachy Score Analysis (Alignment with UChicago Thesis Goals)
        if 'preachy_score' in df.columns:
            avg_preachy = df.groupby('model')['preachy_score'].mean().reset_index()
            fig_preachy = px.bar(
                avg_preachy, 
                x='model', 
                y='preachy_score', 
                title="Average 'Preachy' Score (1-10)",
                color='model',
                template="plotly_white"
            )
            st.plotly_chart(fig_preachy, use_container_width=True)

    # --- 2. PROMPT INSPECTOR ---
    st.divider()
    st.header("🔍 Deep Dive: Prompt Inspector")

    if 'prompt_id' in df.columns:
        # Use sorted unique IDs for selection
        prompt_ids = sorted(df['prompt_id'].unique())
        selected_id = st.selectbox("Select a Prompt ID to compare responses", prompt_ids)
        
        # Display a sample of the raw response text for context
        prompt_row = df[df['prompt_id'] == selected_id].iloc[0]
        st.info(f"**Inspecting Prompt ID:** {selected_id}")

        # Dynamic Grid for Model Comparison
        models = df[df['prompt_id'] == selected_id]['model'].unique()
        cols = st.columns(len(models))

        for i, model
