import streamlit as st
import pandas as pd
import plotly.express as px
import os

TRENDS_PATH = "data/trends.csv"

def apply_material_3_styling():
    """Injects Material 3 design principles via CSS and Material Symbols."""
    st.markdown("""
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap');
        
        /* Material 3 Card Radii and Outlines */
        .stMetric, .stDataFrame, .plotly-graph-div {
            border-radius: 12px !important;
            border: 1px solid #CAC4D0 !important;
            padding: 20px;
            background-color: #FEF7FF;
        }
        
        /* Material 3 Typography */
        h1, h2, h3 {
            font-family: 'Roboto', sans-serif;
            color: #1D1B20;
            font-weight: 500;
        }
        
        .m3-icon { font-family: 'Material Symbols Outlined'; vertical-align: middle; }
        </style>
        """, unsafe_allow_html=True)

def render_persona_profiles(df):
    """Summarizes model 'personalities' based on audit data."""
    st.header("Model Moderation Personalities")
    cols = st.columns(len(df['model'].unique()))
    
    for i, model in enumerate(sorted(df['model'].unique())):
        m_data = df[df['model'] == model]
        top_tone = m_data['tone'].mode()[0] if not m_data['tone'].empty else "N/A"
        avg_preachy = m_data['preachy_score'].mean()
        
        with cols[i]:
            st.markdown(f"### {model.split('/')[-1]}")
            st.write(f"**Dominant Tone:** {top_tone}")
            st.write(f"**Preachiness:** {avg_preachy:.1f}/10")
            
            # Heuristic-based persona profiles
            if avg_preachy > 6:
                st.warning("Profile: The Moralizer")
            elif "historical" in str(m_data['judge_reasoning']).lower():
                st.info("Profile: The Contextualist")
            else:
                st.success("Profile: The Auditor")

def render_detailed_analysis(df):
    """Renders heatmaps and detailed comparison metrics."""
    st.header("🤖 Detailed Model Comparison")
    
    # 1. Inter-Model Disagreement Heatmap
    pivot_df = df.pivot_table(index='prompt_id', columns='model', values='verdict', aggfunc='first').dropna()
    if not pivot_df.empty:
        models = pivot_df.columns
        matrix = pd.DataFrame(index=models, columns=models, dtype=float)
        for m1 in models:
            for m2 in models:
                rate = (pivot_df[m1] != pivot_df[m2]).mean() * 100
                matrix.loc[m1, m2] = rate
        
        fig_heat = px.imshow(
            matrix, 
            text_auto=".1f", 
            color_continuous_scale='Blues', 
            title="Inter-Model Disagreement (%)"
        )
        st.plotly_chart(fig_heat, use_container_width=True)

    # 2. Score Distributions
    col1, col2 = st.columns(2)
    with col1:
        st.plotly_chart(px.box(df, x="model", y="preachy_score", color="model", title="Moralizing Intensity"), use_container_width=True)
    with col2:
        tone_counts = df.groupby(['model', 'tone']).size().reset_index(name='count')
        st.plotly_chart(px.bar(tone_counts, x="model", y="count", color="tone", title="Tone Distribution", barmode="stack"), use_container_width=True)

def render_longitudinal_tracking(df):
    """Line charts showing model behavior stability over time."""
    st.header("Safety Stability (Drift)")
    history = []
    for (date, model), group in df.groupby(['test_date', 'model']):
        # Accuracy: % of harmful prompts correctly blocked
        safety_group = group[group['category'] != 'False Positive Control']
        safety = (safety_group['verdict'] == 'REMOVED').mean() * 100 if not safety_group.empty else 0
        history.append({"Date": date, "Model": model.split('/')[-1], "Safety": safety})
    
    if history:
        fig_drift = px.line(
            pd.DataFrame(history), 
            x="Date", 
            y="Safety", 
            color="Model", 
            markers=True, 
            title="Evolution of Safety Layers"
        )
        st.plotly_chart(fig_drift, use_container_width=True)
    else:
        st.info("Insufficient historical data for drift tracking.")
