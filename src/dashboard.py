import streamlit as st
import pandas as pd
import plotly.express as px

def render_detailed_analysis(df):
    """
    This function is called by app.py and receives the 
    already-loaded dataframe.
    """
    st.header("🤖 Detailed Model Comparison")
    
    if df.empty:
        st.warning("No data available for the selected models.")
        return

    # --- METRICS SECTION ---
    col1, col2 = st.columns(2)
    with col1:
        # Check for 'verdict' (lowercase, as saved by your collection script)
        if 'verdict' in df.columns:
            refusal_counts = df[df['verdict'] == 'REMOVED'].groupby('model').size().reset_index(name='Count')
            fig = px.bar(refusal_counts, x='model', y='Count', title="Total Content Removals", color='model')
            st.plotly_chart(fig, use_container_width=True)

    # --- PROMPT INSPECTOR ---
    st.divider()
    st.header("🔍 Inspect Specific Prompts")

    if 'prompt_id' in df.columns:
        prompt_id = st.selectbox("Select Prompt ID", df['prompt_id'].unique())
        
        # Get the text for this prompt
        prompt_data = df[df['prompt_id'] == prompt_id].iloc[0]
        st.info(f"**Prompt Text:** {prompt_data['response_text'][:200]}...") # Example snippet

        # Dynamic Grid for Models
        models = df[df['prompt_id'] == prompt_id]['model'].unique()
        cols = st.columns(len(models))

        for i, model in enumerate(models):
            data = df[(df['prompt_id'] == prompt_id) & (df['model'] == model)].iloc[0]
            with cols[i]:
                st.subheader(model.split('/')[-1])
                
                if data['verdict'] == 'ALLOWED':
                    st.success("ALLOWED")
                else:
                    st.error("REMOVED")
                
                st.caption(f"**Judge Reasoning:** {data['judge_reasoning']}")
