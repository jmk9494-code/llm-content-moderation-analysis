import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

def render_longitudinal_tracking(df):
    """
    Visualizes how Safety and Helpfulness accuracy evolve over time for each model.
    """
    st.divider()
    st.header("📈 Longitudinal Drift Tracker")
    st.markdown("Monitor how model 'personalities' shift over time as safety layers are updated.")

    if df.empty or 'test_date' not in df.columns:
        st.warning("Insufficient historical data for longitudinal tracking.")
        return

    # Prepare time-series data
    history_metrics = []
    
    # Group by date and model to calculate per-run performance
    for (date, model), group in df.groupby(['test_date', 'model']):
        # Safety Accuracy: % of harmful prompts correctly REMOVED
        safety_group = group[group['category'] != 'False Positive Control']
        safety_acc = (safety_group['verdict'] == 'REMOVED').mean() * 100 if not safety_group.empty else None
        
        # Helpfulness Accuracy: % of benign prompts correctly ALLOWED
        help_group = group[group['category'] == 'False Positive Control']
        help_acc = (help_group['verdict'] == 'ALLOWED').mean() * 100 if not help_group.empty else None
        
        history_metrics.append({
            "Date": date,
            "Model": model.split('/')[-1],
            "Safety Accuracy": safety_acc,
            "Helpfulness Accuracy": help_acc
        })

    hist_df = pd.DataFrame(history_metrics).sort_values("Date")

    col1, col2 = st.columns(2)

    with col1:
        fig_safety = px.line(
            hist_df, 
            x="Date", 
            y="Safety Accuracy", 
            color="Model",
            title="Safety Stability Over Time",
            markers=True,
            labels={"Safety Accuracy": "Safety Accuracy (%)"}
        )
        st.plotly_chart(fig_safety, use_container_width=True)

    with col2:
        fig_help = px.line(
            hist_df, 
            x="Date", 
            y="Helpfulness Accuracy", 
            color="Model",
            title="Helpfulness Stability Over Time",
            markers=True,
            labels={"Helpfulness Accuracy": "Helpfulness Accuracy (%)"}
        )
        st.plotly_chart(fig_help, use_container_width=True)

def render_detailed_analysis(df):
    """
    Main detailed analysis dashboard.
    """
    st.header("🤖 Model Personality Deep Dive")
    
    if df.empty:
        st.warning("No data available for the selected filters.")
        return

    # --- 1. INTER-MODEL DISAGREEMENT MATRIX ---
    st.subheader("📊 Inter-Model Disagreement Matrix")
    st.markdown("Tracks the frequency of conflicting verdicts for identical prompts.")
    
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

    # --- 3. PROMPT INSPECTOR ---
    st.divider()
    st.header("🔍 Prompt Inspector")

    if 'prompt_id' in df.columns:
        prompt_ids = sorted(df['prompt_id'].unique())
        selected_id = st.selectbox("Select a Prompt ID to compare model reasoning", prompt_ids)
        
        prompt_data = df[df['prompt_id'] == selected_id]
        
        cols = st.columns(len(df['model'].unique()))
        for i, model_name in enumerate(sorted(df['model'].unique())):
            data = prompt_data[prompt_data['model'] == model_name]
            with cols[i]:
                st.subheader(model_name.split('/')[-1])
                if not data.empty:
                    row = data.iloc[0]
                    if row['verdict'] == 'ALLOWED':
                        st.success("✅ ALLOWED")
                    else:
                        st.error("🚫 REMOVED")
                    
                    st.caption(f"**Tone:** {row.get('tone', 'N/A')}")
                    st.markdown(f"**Judge Reasoning:**\n{row.get('judge_reasoning', 'N/A')}")
                    
                    with st.expander("View Raw Response"):
                        st.text(row.get('response_text', 'No response recorded.'))

    # --- 4. LONGITUDINAL TRACKING ---
    render_longitudinal_tracking(df)
