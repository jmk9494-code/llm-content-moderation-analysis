import streamlit as st
import pandas as pd
import plotly.express as px
import os
from src.ui import m3_metric_card

# Persistence path for longitudinal data
TRENDS_PATH = "data/trends.csv"

def render_summary_metrics(df):
    """Renders the top-level 'Big Number' cards."""
    if df.empty: return
    
    total_prompts = len(df)
    unique_models = df['model'].nunique()
    avg_cost = df['run_cost'].mean()
    removal_rate = (df['verdict'] == 'REMOVED').mean() * 100
    
    c1, c2, c3, c4 = st.columns(4)
    with c1: m3_metric_card("Total Prompts", f"{total_prompts:,}")
    with c2: m3_metric_card("Models Audited", str(unique_models))
    with c3: m3_metric_card("Avg Cost", f"${avg_cost:.5f}")
    with c4: m3_metric_card("Refusal Rate", f"{removal_rate:.1f}%")

def render_cost_efficiency(df):
    """M3-styled Price of Safety chart."""
    st.markdown("### Cost vs. Strictness")
    cost_sum = df.groupby('model').agg({'run_cost': 'mean', 'verdict': lambda x: (x == 'REMOVED').mean() * 100}).reset_index()
    cost_sum.columns = ['model', 'cost', 'strictness']

    fig = px.scatter(cost_sum, x="cost", y="strictness", text="model", size="strictness", color="model",
                     template="plotly_white", title="Price of Safety Index",
                     labels={"cost": "Avg Cost (USD)", "strictness": "Refusal Rate (%)"},
                     color_discrete_sequence=px.colors.sequential.Purples_r) # M3 Palette
    
    fig.update_traces(textposition='top center', marker=dict(line=dict(width=1, color='DarkSlateGrey')))
    fig.update_layout(
        paper_bgcolor='rgba(0,0,0,0)', 
        plot_bgcolor='rgba(0,0,0,0)',
        font=dict(family="Roboto", size=14)
    )
    st.plotly_chart(fig, use_container_width=True)

def render_detailed_analysis(df):
    """Deep-dive metrics with M3 tonal heatmaps."""
    st.markdown("### Inter-Model Disagreement")
    pivot_df = df.pivot_table(index='prompt_id', columns='model', values='verdict', aggfunc='first').dropna()
    
    if not pivot_df.empty:
        models = pivot_df.columns
        matrix = pd.DataFrame(index=models, columns=models, dtype=float)
        for m1 in models:
            for m2 in models:
                matrix.loc[m1, m2] = (pivot_df[m1] != pivot_df[m2]).mean() * 100
        
        # Heatmap with Purple scale to match M3 theme
        fig_heat = px.imshow(matrix, text_auto=".1f", color_continuous_scale='Purples', aspect='auto')
        fig_heat.update_layout(
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            font=dict(family="Roboto")
        )
        st.plotly_chart(fig_heat, use_container_width=True)
    else:
        st.info("Not enough overlapping data to calculate disagreement.")

def render_longitudinal_tracking():
    """Long-term drift monitoring using Roboto typography."""
    st.markdown("### Weekly Safety Drift")
    if os.path.exists(TRENDS_PATH):
        trends = pd.read_csv(TRENDS_PATH)
        if trends.empty:
            st.info("Trend data is initialized but empty. Check back after the next audit run.")
            return

        trends['model_short'] = trends['model'].apply(lambda x: x.split('/')[-1])
        
        fig = px.line(trends, x="test_date", y="pct_allowed", color="model_short", markers=True, 
                      template="plotly_white", 
                      labels={"pct_allowed": "% Allowed", "test_date": "Audit Date"},
                      color_discrete_sequence=px.colors.qualitative.Prism)
        
        fig.update_layout(
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            font=dict(family="Roboto"),
            hovermode="x unified"
        )
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.warning("Trend file not found.")
