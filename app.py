import streamlit as st
import pandas as pd
import plotly.express as px

# 1. Resilient Import for scikit-learn
try:
    from sklearn.metrics import cohen_kappa_score
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

def get_kappa_label(k):
    """Returns a qualitative label for the Cohen's Kappa score."""
    if pd.isna(k) or k < 0: return "Poor/None"
    if k <= 0.2: return "Slight"
    if k <= 0.4: return "Fair"
    if k <= 0.6: return "Moderate"
    if k <= 0.8: return "Substantial"
    return "Almost Perfect"

def calculate_agreement(df):
    """Calculates and displays the Cohen's Kappa agreement."""
    st.header("🤝 Inter-rater Agreement (Cohen's Kappa)")
    
    if not SKLEARN_AVAILABLE:
        st.warning("Agreement metrics are disabled because 'scikit-learn' is not installed in this environment.")
        return

    st.markdown("Measures agreement between the **AI Judge** and your **Expected Verdict**.")
    
    # Required columns check
    required = ['model', 'expected_verdict', 'verdict']
    if not all(col in df.columns for col in required):
        st.warning("Required columns for agreement analysis are missing.")
        return

    # Create layout for metrics
    models = df['model'].unique()
    cols = st.columns(len(models))

    for i, model in enumerate(models):
        # Filter and drop missing values
        m_data = df[df['model'] == model].dropna(subset=['expected_verdict', 'verdict'])
        
        # Check if we have valid data and if Expected Verdict contains meaningful data (not just 'NONE')
        has_real_expectations = (m_data['expected_verdict'] != 'NONE').any()
        
        if not m_data.empty and has_real_expectations:
            try:
                kappa = cohen_kappa_score(m_data['expected_verdict'], m_data['verdict'])
                label = get_kappa_label(kappa)
                with cols[i]:
                    st.metric(f"{model.split('/')[-1]} Agreement", f"{kappa:.2f}", help=f"Strength: {label}")
            except Exception as e:
                with cols[i]:
                    st.caption(f"Agreement N/A for {model.split('/')[-1]}")
        else:
            with cols[i]:
                st.caption(f"No ground truth for {model.split('/')[-1]}")

def render_detailed_analysis(df):
    """Renders the main analysis charts and inspectors."""
    st.header("🤖 Detailed Model Comparison")
    
    if df.empty:
        st.warning("No data available for the selected models.")
        return

    # --- 1. PERFORMANCE METRICS ---
    col1, col2 = st.columns(2)
    
    with col1:
        if 'verdict' in df.columns:
            refusal_counts = df[df['verdict'] == 'REMOVED'].groupby('model').size().reset_index(name='Count')
            if not refusal_counts.empty:
                fig = px.bar(refusal_counts, x='model', y='Count', title="Total Content Removals", color='model')
                st.plotly_chart(fig, use_container_width=True)

    with col2:
        if 'preachy_score' in df.columns:
            avg_preachy = df.groupby('model')['preachy_score'].mean().reset_index()
            fig_preachy = px.bar(avg_preachy, x='model', y='preachy_score', title="Average 'Preachy' Score", color='model')
            st.plotly_chart(fig_preachy, use_container_width=True)

    # --- 2. AGREEMENT ANALYSIS ---
    st.divider()
    calculate_agreement(df)

    # --- 3. PROMPT INSPECTOR ---
    st.divider()
    st.header("🔍 Deep Dive: Prompt Inspector")
    if 'prompt_id' in df.columns:
        prompt_ids = sorted(df['prompt_id'].unique())
        selected_id = st.selectbox("Select a Prompt ID to compare responses", prompt_ids)
        
        prompt_view = df[df['prompt_id'] == selected_id]
        st.info(f"**Inspecting Prompt ID:** {selected_id}")

        models = prompt_view['model'].unique()
        cols = st.columns(len(models))

        for i, model_name in enumerate(models):
            data = prompt_view[prompt_view['model'] == model_name].iloc[0]
            with cols[i]:
                st.subheader(model_name.split('/')[-1])
                if data['verdict'] == 'ALLOWED':
                    st.success("✅ ALLOWED")
                else:
                    st.error("🚫 REMOVED")
                
                st.caption(f"**Tone:** {data.get('tone', 'N/A')}")
                st.markdown(f"**Reasoning:**\n{data.get('judge_reasoning', 'N/A')}")
                with st.expander("View Raw Response"):
                    st.text(data.get('response_text', 'No response.'))
