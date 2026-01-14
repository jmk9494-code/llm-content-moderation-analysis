import streamlit as st
import pandas as pd
import plotly.express as px

def render_persona_profiles(df):
    """Summarizes model 'personalities' based on tone and reasoning themes."""
    st.divider()
    st.header("🎭 Automated Persona Profiles")
    st.markdown("Quantifying the moderation 'personality' of each provider based on collected audit data.")

    cols = st.columns(len(df['model'].unique()))
    
    for i, model in enumerate(sorted(df['model'].unique())):
        m_data = df[df['model'] == model]
        
        # Calculate heuristics
        top_tone = m_data['tone'].mode()[0] if not m_data['tone'].empty else "N/A"
        avg_preachy = m_data['preachy_score'].mean()
        
        # Identify core themes in judge reasoning
        reasoning_text = " ".join(m_data['judge_reasoning'].fillna("").astype(str)).lower()
        keywords = {"context": "Contextual", "policy": "Rule-Based", "harm": "Safety-First", "historical": "Educational"}
        themes = [v for k, v in keywords.items() if k in reasoning_text]

        with cols[i]:
            st.subheader(model.split('/')[-1])
            st.metric("Dominant Tone", top_tone)
            st.metric("Moralizing Score", f"{avg_preachy:.1f}/10")
            
            # Persona labels
            if avg_preachy > 6:
                st.warning("Profile: **The Moralizer**")
            elif "Contextual" in themes:
                st.info("Profile: **The Contextualist**")
            else:
                st.success("Profile: **The Standard Auditor**")

def render_detailed_analysis(df):
    """Detailed charts for Disagreement, Preachy scores, and Tone."""
    st.divider()
    st.header("📊 Deep Dive Visuals")

    # 1. Disagreement Heatmap
    pivot_df = df.pivot_table(index='prompt_id', columns='model', values='verdict', aggfunc='first').dropna()
    if not pivot_df.empty:
        st.subheader("Inter-Model Disagreement Matrix (%)")
        models = pivot_df.columns
        matrix = pd.DataFrame(index=models, columns=models, dtype=float)
        for m1 in models:
            for m2 in models:
                rate = (pivot_df[m1] != pivot_df[m2]).mean() * 100
                matrix.loc[m1, m2] = rate
        st.plotly_chart(px.imshow(matrix, text_auto=".1f", color_continuous_scale='RdBu_r'))

    # 2. Box plots and Bar charts
    col1, col2 = st.columns(2)
    with col1:
        st.plotly_chart(px.box(df, x="model", y="preachy_score", color="model", title="Moralizing Intensity"))
    with col2:
        tone_counts = df.groupby(['model', 'tone']).size().reset_index(name='count')
        st.plotly_chart(px.bar(tone_counts, x="model", y="count", color="tone", title="Tone Distribution"))

def render_longitudinal_tracking(df):
    """Line charts showing drift over time."""
    st.divider()
    st.header("📈 Drift Tracker")
    metrics = []
    for (date, model), group in df.groupby(['test_date', 'model']):
        safety = (group[group['category'] != 'False Positive Control']['verdict'] == 'REMOVED').mean() * 100
        metrics.append({"Date": date, "Model": model.split('/')[-1], "Safety": safety})
    
    st.plotly_chart(px.line(pd.DataFrame(metrics), x="Date", y="Safety", color="Model", markers=True))
