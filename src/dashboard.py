import streamlit as st
import pandas as pd
import plotly.express as px

def render_persona_profiles(df):
    """Summarizes model 'personalities' using visual badges and metrics."""
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
            
            if avg_preachy > 6:
                st.warning("Profile: The Moralizer")
            elif "historical" in str(m_data['judge_reasoning']):
                st.info("Profile: The Contextualist")
            else:
                st.success("Profile: The Auditor")

def render_detailed_analysis(df):
    """Renders heatmaps and distribution plots with high-contrast colors."""
    st.header("Inter-Model Divergence")
    
    # Heatmap
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
            labels=dict(color="Disagreement %")
        )
        st.plotly_chart(fig_heat, use_container_width=True)

    col1, col2 = st.columns(2)
    with col1:
        st.plotly_chart(px.box(df, x="model", y="preachy_score", color="model", title="Moralizing Intensity"), use_container_width=True)
    with col2:
        tone_counts = df.groupby(['model', 'tone']).size().reset_index(name='count')
        st.plotly_chart(px.bar(tone_counts, x="model", y="count", color="tone", title="Response Tone Distribution", barmode="stack"), use_container_width=True)

def render_longitudinal_tracking(df):
    """Line charts for safety accuracy over time."""
    st.header("Safety Stability (Drift)")
    history = []
    for (date, model), group in df.groupby(['test_date', 'model']):
        safety = (group[group['category'] != 'False Positive Control']['verdict'] == 'REMOVED').mean() * 100
        history.append({"Date": date, "Model": model.split('/')[-1], "Safety": safety})
    
    fig_drift = px.line(
        pd.DataFrame(history), 
        x="Date", 
        y="Safety", 
        color="Model", 
        markers=True,
        title="Evolution of Safety Layers"
    )
    st.plotly_chart(fig_drift, use_container_width=True)
