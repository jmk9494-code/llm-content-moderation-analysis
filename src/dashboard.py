import streamlit as st
import pandas as pd
import plotly.express as px

def render_detailed_analysis(df):
    """
    This function is called by app.py to render the detailed analysis section.
    It uses the data loaded and filtered in the main application.
    """
    st.header("🤖 Detailed Model Comparison")
    
    if df.empty:
        st.warning("No data available for the selected models. Please check your filters or run the collection script.")
        return

    # --- 1. VISUALIZATIONS ---
    col1, col2 = st.columns(2)
    
    with col1:
        # Aggregate removals by model using lowercase column names from your results CSVs
        if 'verdict' in df.columns and 'model' in df.columns:
            refusal_counts = df[df['verdict'] == 'REMOVED'].groupby('model').size().reset_index(name='Count')
            if not refusal_counts.empty:
                fig = px.bar(
                    refusal_counts, 
                    x='model', 
                    y='Count', 
                    title="Total Content Removals by Model",
                    color='model',
                    labels={'model': 'LLM Model', 'Count': 'Number of Removals'}
                )
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("No 'REMOVED' verdicts found in the current selection.")
        else:
            st.error("Data error: Required columns 'verdict' or 'model' are missing.")

    with col2:
        # Preachy Score Analysis
        if 'preachy_score' in df.columns:
            avg_preachy = df.groupby('model')['preachy_score'].mean().reset_index()
            fig_preachy = px.line_polar(
                avg_preachy, 
                r='preachy_score', 
                theta='model', 
                line_close=True,
                title="Average 'Preachy' Score (1-10)"
            )
            st.plotly_chart(fig_preachy, use_container_width=True)

    # --- 2. PROMPT INSPECTOR ---
    st.divider()
    st.header("🔍 Deep Dive: Prompt Inspector")

    if 'prompt_id' in df.columns:
        # Allow user to select a specific prompt to see how each model handled it
        prompt_id = st.selectbox("Select a Prompt ID to inspect responses:", sorted(df['prompt_id'].unique()))
        
        # Display the prompt text (taken from the first model's entry for this ID)
        specific_prompt_data = df[df['prompt_id'] == prompt_id].iloc[0]
        # Note: If Response_Text is large, we show a snippet or the full text
        st.info(f"**Inspecting Prompt ID:** {prompt_id}") 
        
        # Create a dynamic grid of columns for each model tested
        models_for_prompt = df[df['prompt_id'] == prompt_id]['model'].unique()
        cols = st.columns(len(models_for_prompt))

        for i, model_name in enumerate(models_for_prompt):
            # Get data for this specific model and prompt
            model_data = df[(df['prompt_id'] == prompt_id) & (df['model'] == model_name)].iloc[0]
            
            with cols[i]:
                # Display cleaner model names
                display_name = model_name.split('/')[-1]
                st.subheader(display_name)
                
                # Color-coded verdict
                if model_data['verdict'] == 'ALLOWED':
                    st.success("✅ ALLOWED")
                else:
                    st.error("🚫 REMOVED")
                
                # Show the judge's reasoning and the raw response
                st.markdown(f"**Judge Reasoning:**\n{model_data.get('judge_reasoning', 'N/A')}")
                with st.expander("View Full Raw Response"):
                    st.text(model_data.get('response_text', 'No response recorded.'))
    else:
        st.warning("Column 'prompt_id' not found in dataset.")
