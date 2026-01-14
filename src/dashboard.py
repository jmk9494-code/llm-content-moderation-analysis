import streamlit as st
import pandas as pd
import plotly.express as px
import os

# Persistence path for longitudinal data
TRENDS_PATH = "data/trends.csv"

def apply_material_3_styling():
    """Injects high-fidelity Material 3 design tokens into the Streamlit UI."""
    st.markdown("""
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap');
        
        /* M3 Typography and Surface Baseline */
        .main { background-color: #FEF7FF; font-family: 'Roboto', sans-serif; }
        
        /* M3 Adaptive Cards: Standardized border radii and outline intensity */
        .stMetric, .stDataFrame, .plotly-graph-div, div[data-testid="stExpander"] {
            border-radius: 12px !important;
            border: 1px solid #CAC4D0 !important;
            padding: 24px;
            background-color: #FEF7FF;
            transition: box-shadow 0.3s ease;
        }

        /* Material 3 Headline 1-3 */
        h1, h2, h3 { font-family: 'Roboto', sans-serif; color: #1D1B20; font-weight: 500; }
        
        /* Navigation Rail / Sidebar Polish */
        section[data-testid="stSidebar"] { background-color: #F3EDF7; border-right: 1px solid #E6E0E9; }

        /* M3 Iconography Utility */
        .m3-icon { 
            family: 'Material Symbols Outlined'; 
            vertical-align: middle; 
            font-size: 24px;
            margin-right: 10px;
            color: #6750A4;
        }
        </style>
        """, unsafe_allow_html=True)

def render_persona_profiles(df):
    """M3 Persona Cards using tonal containers for profile status."""
    st.markdown("## <span class='m3-icon'>face</span> Moderation Personalities", unsafe_allow_html=True)
    cols = st.columns(len(df['model'].unique()))
    
    for i, model in enumerate(sorted(df['model'].unique())):
        m_data = df[df['model'] == model]
        
        # FIX: Check if mode series has any results to avoid KeyError: 0
        modes = m_data['tone'].mode()
        top_tone = modes[0] if not modes.empty else "N/A"
        
        avg_preachy = m_data['preachy_score'].mean()
        
        with cols[i]:
            st.markdown(f"### {model.split('/')[-1]}")
            st.write(f"**Tone:** {top_tone}")
            st.write(f"**Preachiness:** {avg_preachy:.1f}/10")
            
            # M3 Status Labels
            if avg_preachy > 6:
                st.markdown("<div style='background-color:#FFDAD6; color:#410002; padding:8px; border-radius:8px;'><b>The Moralizer</b></div>", unsafe_allow_html=True)
            elif "historical" in str(m_data['judge_reasoning']).lower():
                st.markdown("<div style='background-color:#D0E4FF; color:#001D34; padding:8px; border-radius:8px;'><b>The Contextualist</b></div>", unsafe_allow_html=True)
            else:
                st.markdown("<div style='background-color:#E8DEF8; color:#1D192B; padding:8px; border-radius:8px;'><b>The Auditor</b></div>", unsafe_allow_html=True)

def render_cost_efficiency(df):
    """M3-styled Price of Safety chart."""
    st.markdown("## <span class='m3-icon'>payments</span> Cost-Safety Tradeoff", unsafe_allow_html=True)
    cost_sum = df.groupby('model').agg({'run_cost': 'mean', 'verdict': lambda x: (x == 'REMOVED').mean() * 100}).reset_index()
    cost_sum.columns = ['model', 'cost', 'strictness']

    fig = px.scatter(cost_sum, x="cost", y="strictness", text="model", size="strictness", color="model",
                     template="plotly_white", title="Price of Safety Index",
                     labels={"cost": "Avg Cost (USD)", "strictness": "Refusal Rate (%)"})
    fig.update_layout(paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
    st.plotly_chart(fig, use_container_width=True)

def render_detailed_analysis(df):
    """Deep-dive metrics with M3 tonal heatmaps."""
    st.markdown("## <span class='m3-icon'>analytics</span> Divergence Audit", unsafe_allow_html=True)
    pivot_df = df.pivot_table(index='prompt_id', columns='model', values='verdict', aggfunc='first').dropna()
    if not pivot_df.empty:
        models = pivot_df.columns
        matrix = pd.DataFrame(index=models, columns=models, dtype=float)
        for m1 in models:
            for m2 in models:
                matrix.loc[m1, m2] = (pivot_df[m1] != pivot_df[m2]).mean() * 100
        
        fig_heat = px.imshow(matrix, text_auto=".1f", color_continuous_scale='Purples', title="Inter-Model Disagreement (%)")
        st.plotly_chart(fig_heat, use_container_width=True)

def render_longitudinal_tracking():
    """Long-term drift monitoring using Roboto typography."""
    st.markdown("## <span class='m3-icon'>timeline</span> Stability Tracking", unsafe_allow_html=True)
    if os.path.exists(TRENDS_PATH):
        trends = pd.read_csv(TRENDS_PATH)
        trends['model_short'] = trends['model'].apply(lambda x: x.split('/')[-1])
        st.plotly_chart(px.line(trends, x="test_date", y="pct_allowed", color="model_short", markers=True, 
                                template="plotly_white", title="Weekly Safety Drift"), use_container_width=True)
    else:
        st.info("Insufficient data for longitudinal tracking.")
