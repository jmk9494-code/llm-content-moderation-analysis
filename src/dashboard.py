import streamlit as st
import pandas as pd
import plotly.express as px

def render_detailed_analysis(df):
    st.header("Inter-Model Divergence")
    
    # 1. Heatmap with Custom Tooltips
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
            labels=dict(x="Model B", y="Model A", color="Disagreement %")
        )
        # Update hover template for clarity
        fig_heat.update_traces(hovertemplate="Model A: %{y}<br>Model B: %{x}<br>Disagreement: %{z:.1f}%<extra></extra>")
        st.plotly_chart(fig_heat, use_container_width=True)

    # 2. Box Plots with Help Text
    st.subheader("Moralizing Intensity (Preachy Score)")
    st.caption("Hover over the chart to see quartiles and outliers.")
    fig_box = px.box(
        df, x="model", y="preachy_score", color="model",
        points="all",
        title="Distribution of Moralizing Behavior (1-10 Scale)"
    )
    fig_box.update_layout(hovermode="closest")
    st.plotly_chart(fig_box, use_container_width=True)
