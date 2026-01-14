import streamlit as st
import pandas as pd
import plotly.express as px
import os
import datetime

# Configuration
TRENDS_PATH = "data/trends.csv"

def apply_material_3_styling():
    """Injects Material 3 design principles via CSS and Material Symbols."""
    st.markdown("""
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap');
        
        /* Material 3 Surface and Typography Baseline */
        .main {
            background-color: #FEF7FF;
            font-family: 'Roboto', sans-serif;
        }
        
        /* M3 Card Style: Medium Corner Radius and Outline */
        .stMetric, .stDataFrame, .plotly-graph-div, div[data-testid="stExpander"] {
            border-radius: 12px !important;
            border: 1px solid #CAC4D0 !important;
            padding: 20px;
            background-color: #FEF7FF;
            margin-bottom: 1rem;
        }
        
        /* M3 Headline Styles */
        h1, h2, h3 {
            font-family: 'Roboto', sans-serif;
            color: #1D1B20;
            font-weight: 500;
            letter-spacing: 0.1px;
        }
        
        /* Sidebar customization to M3 Container */
        section[data-testid="stSidebar"] {
            background-color: #F3EDF7;
        }

        .m3-icon { 
            font-family: 'Material Symbols Outlined'; 
            vertical-align: middle; 
            font-size: 24px;
            padding-right: 8px;
        }
        </style>
        """, unsafe_allow_html=True)

def render_persona_profiles(df):
    """Summarizes model 'personalities' based on audit data using M3 layout."""
    st.markdown("## <span class='m3-icon'>face</span> Model Moderation Personalities", unsafe_allow_html=True)
    cols = st.columns(len(df['model'].unique()))
    
    for i, model in enumerate(sorted(df['model'].unique())):
        m_data = df[df['model'] == model]
        top_tone = m_data['tone'].mode()[0] if not m_data['tone'].empty else "N/A"
        avg_preachy = m_data['preachy_score'].mean()
        
        with cols[i]:
            st.markdown(f"### {model.split('/')[-1]}")
            st.write(f"**Dominant Tone:** {top_tone}")
            st.write(f"**Preachiness:** {avg_preachy:.1f}/10")
            
            # Heuristic-based persona profiles using M3 status colors
            if avg_preachy > 6:
                st.warning("Profile: The Moralizer")
            elif "historical" in str(m_data['judge_reasoning']).lower():
                st.info("Profile: The Contextualist")
            else:
                st.success("Profile: The Auditor")

def render_cost_efficiency(df):
    """Visualizes the 'Price of Safety' (Improvement 5)."""
    st.markdown("## <span class='m3-icon'>payments</span> Cost vs. Strictness", unsafe_allow_html=True)
    
    cost_summary = df.groupby('model').agg({
        'run_cost': 'mean',
        'verdict': lambda x: (x == 'REMOVED').mean() * 100
    }).reset_index()
    cost_summary.columns = ['model', 'avg_cost_per_prompt', 'refusal_rate']

    fig = px.scatter(
        cost_summary, 
        x="avg_cost_per_prompt", 
        y="refusal_rate", 
        text="model",
        size="refusal_rate",
        color="model",
        template="plotly_white",
        title="Moderation Price of Safety (Cost vs. Refusal Rate)",
        labels={"avg_cost_per_prompt": "Avg Cost (USD)", "refusal_rate": "Refusal Rate (%)"}
    )
    fig.update_traces(textposition='top center')
    st.plotly_chart(fig, use_container_width=True)

def render_detailed_analysis(df):
    """Renders heatmaps and detailed comparison metrics."""
    st.markdown("## <span class='m3-icon'>analytics</span> Detailed Model Comparison", unsafe_allow_html=True)
    
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
            color_continuous_scale='Purples', # M3 primary palette
            title="Inter-Model Disagreement Rate (%)"
        )
        st.plotly_chart(fig_heat, use_container_width=True)

    # 2. Score Distributions
    col1, col2 = st.columns(2)
    with col1:
        st.plotly_chart(px.box(df, x="model", y="preachy_score", color="model", 
                               template="plotly_white", title="Moralizing Intensity"), use_container_width=True)
    with col2:
        tone_counts = df.groupby(['model', 'tone']).size().reset_index(name='count')
        st.plotly_chart(px.bar(tone_counts, x="model", y="count", color="tone", 
                               template="plotly_white", title="Tone Distribution", barmode="stack"), use_container_width=True)

def render_longitudinal_tracking():
    """Line charts showing model behavior stability from trends.csv (Improvement 6)."""
    st.markdown("## <span class='m3-icon'>timeline</span> Safety Stability (Drift)", unsafe_allow_html=True)
    
    if os.path.exists(TRENDS_PATH):
        trends_df = pd.read_csv(TRENDS_PATH)
        trends_df['model_short'] = trends_df['model'].apply(lambda x: x.split('/')[-1])
        
        col1, col2 = st.columns(2)
        with col1:
            st.plotly_chart(px.line(trends_df, x="test_date", y="pct_allowed", color="model_short", 
                                    markers=True, template="plotly_white", title="Permissiveness Over Time"), use_container_width=True)
        with col2:
            st.plotly_chart(px.line(trends_df, x="test_date", y="avg_preachy", color="model_short", 
                                    markers=True, template="plotly_white", title="Moralizing Drift"), use_container_width=True)
    else:
        st.info("Insufficient historical data for longitudinal tracking. Run analysis to populate trends.")

def main():
    st.set_page_config(page_title="Algorithmic Arbiters", layout="wide")
    apply_material_3_styling()
    
    st.title("Algorithmic Arbiters: LLM Moderation Dashboard")
    st.markdown("Comparative analysis of moderation biases and philosophies in Large Language Models.")

    # Load most recent data
    run_date = datetime.datetime.now().strftime("%Y-%m-%d")
    latest_file = f"data/history/results_{run_date}.csv"
    
    if os.path.exists(latest_file):
        df = pd.read_csv(latest_file)
        
        # Sidebar Filter
        st.sidebar.header("Dashboard Filters")
        selected_models = st.sidebar.multiselect("Select Models", options=df['model'].unique(), default=df['model'].unique())
        filtered_df = df[df['model'].isin(selected_models)]

        # Render Components
        render_persona_profiles(filtered_df)
        render_cost_efficiency(filtered_df)
        render_detailed_analysis(filtered_df)
        render_longitudinal_tracking()
    else:
        st.error(f"Latest data file ({latest_file}) not found. Please run the collection script.")

if __name__ == "__main__":
    main()
