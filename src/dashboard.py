import streamlit as st
import pandas as pd
import plotly.express as px
import os

# Persistence path for long-term drift monitoring
TRENDS_PATH = "data/trends.csv"

def apply_material_3_styling():
    """Injects high-fidelity M3 design tokens and Roboto typography."""
    st.markdown("""
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap');
        
        /* Baseline Surface and Typography */
        .main { background-color: #FEF7FF; font-family: 'Roboto', sans-serif; }
        
        /* M3 Adaptive Containers: Standardized radii and tonal elevation */
        .stMetric, .stDataFrame, .plotly-graph-div, div[data-testid="stExpander"] {
            border-radius: 12px !important;
            border: 1px solid #CAC4D0 !important;
            padding: 24px;
            background-color: #FEF7FF;
            transition: box-shadow 0.2s ease-in-out;
        }

        /* Material 3 Headline styling */
        h1, h2, h3 { font-family: 'Roboto', sans-serif; color: #1D1B20; font-weight: 500; }
        
        /* Navigation Rail / Sidebar Surface */
        section[data-testid="stSidebar"] { 
            background-color: #F3EDF7; 
            border-right: 1px solid #E6E0E9; 
        }

        /* Material Symbol Utility */
        .m3-icon { 
            font-family: 'Material Symbols Outlined'; 
            vertical-align: middle; 
            font-size: 26px;
            margin-right: 12px;
            color: #6750A4;
        }
        </style>
        """, unsafe_allow_html=True)

def render_persona_profiles(df):
    """M3 Persona Cards using tonal background offsets for status visibility."""
    st.markdown("## <span class='m3-icon'>face</span> Moderation Personalities", unsafe_allow_html=True)
    cols = st.columns(len(df['model'].unique()))
    
    for i, model in enumerate(sorted(df['model'].unique())):
        m_data = df[df['model'] == model]
        top_tone = m_data['tone'].mode()[0] if not m_data['tone'].empty else "N/A"
        avg_preachy = m_data['preachy_score'].mean()
        
        with cols[i]:
            st.markdown(f"### {model.split('/')[-1]}")
            st.write(f"**Dominant Tone:** {top_tone}")
            st.write(f"**Preachiness:** {avg_preachy:.1f}/10")
            
            # M3 Tonal Status Indicators
            if avg_preachy > 6:
                st.markdown("<div style='background-color:#FFDAD6; color:#410002; padding:10px; border-radius:8px;'><b>The Moralizer</b></div>", unsafe_allow_html=True)
            elif "historical" in str(m_data['judge_reasoning']).lower():
                st.markdown("<div style='background-color:#D0E4FF; color:#001D34; padding:10px; border-radius:8px;'><b>The Contextualist</b></div>", unsafe_allow_html=True)
            else:
                st.markdown("<div style='background-color:#E8DEF8; color:#1D192B; padding:10px; border-radius:8px;'><b>The Auditor</b></div>", unsafe_allow_html=True)

def render_cost_efficiency(df):
    """M3 Cost-Safety Tradeoff visualization."""
    st.markdown("## <span class='m3-icon'>payments</span> Cost-Safety Tradeoff", unsafe_allow_html=True)
    cost_sum = df.groupby('model').agg({'run_cost': 'mean', 'verdict': lambda x: (x == 'REMOVED').mean() * 100}).reset_index()
    cost_sum.columns = ['model', 'cost', 'strictness']

    fig = px.scatter(cost_sum, x="cost", y="strictness", text="model", size="strictness", color="model",
                     template="plotly_white", title="Price of Safety Index",
                     labels={"cost": "Avg Cost (USD)", "strictness": "Refusal Rate (%)"})
    fig.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
    st.plotly_chart(fig, use_container_width=True)

def render_longitudinal_tracking():
    """Visualizes behavioral stability over time using M3-compliant charts."""
    st.markdown("## <span class='m3-icon'>timeline</span> Safety Stability Tracking", unsafe_allow_html=True)
    if os.path.exists(TRENDS_PATH):
        trends = pd.read_csv(TRENDS_PATH)
        trends['model_short'] = trends['model'].apply(lambda x: x.split('/')[-1])
        st.plotly_chart(px.line(trends, x="test_date", y="pct_allowed", color="model_short", markers=True, 
                                template="plotly_white", title="Permissiveness Stability Over Time"), use_container_width=True)
    else:
        st.info("Insufficient data for longitudinal tracking. Please run a new audit cycle.")
