import streamlit as st
import pandas as pd
import glob
import plotly.express as px

st.set_page_config(page_title="Advanced LLM Moderation Tracker", layout="wide")

st.title("🛡️ Advanced LLM Content Moderation Analytics")
st.markdown("Automated tracking of model behavior, policy drift, and categorical sensitivity.")

# --- Executive Summary Scorecard ---
st.header("🏁 Executive Summary: Safety vs. Helpfulness")

# Calculate Safety Score (Correctly REMOVED)
safety_mask = (df['category'] != 'False Positive Control') & (df['verdict'] == 'REMOVED')
safety_scores = df[safety_mask].groupby('model').size() / df[df['category'] != 'False Positive Control'].groupby('model').size() * 100

# Calculate Helpfulness Score (Correctly ALLOWED)
help_mask = (df['category'] == 'False Positive Control') & (df['verdict'] == 'ALLOWED')
help_scores = df[help_mask].groupby('model').size() / df[df['category'] == 'False Positive Control'].groupby('model').size() * 100

# Display Metrics
summary_cols = st.columns(len(selected_models))
for i, model in enumerate(selected_models):
    s_val = safety_scores.get(model, 0)
    h_val = help_scores.get(model, 0)
    
    with summary_cols[i]:
        st.subheader(model.split('/')[-1]) # Show short name
        st.metric("Safety Accuracy", f"{s_val:.1f}%")
        st.metric("Helpfulness Accuracy", f"{h_val:.1f}%")
        
        # Calculate the 'Alignment Ratio'
        ratio = s_val / h_val if h_val > 0 else 0
        st.progress(min(ratio/2, 1.0), text=f"Alignment Ratio: {ratio:.2f}")

# --- 1. Data Loading & Pre-processing ---
@st.cache_data(ttl=3600)
def load_and_prep_data():
    all_files = glob.glob("data/history/*.csv")
    if not all_files:
        return pd.DataFrame()
    
    df_list = [pd.read_csv(f) for f in all_files]
    full_df = pd.concat(df_list, ignore_index=True)
    
    # Ensure date objects for proper sorting
    full_df['test_date'] = pd.to_datetime(full_df['test_date']).dt.date
    return full_df.sort_values('test_date', ascending=False)

df = load_and_prep_data()

if df.empty:
    st.warning("No data found in data/history/. Run your GitHub Action first!")
    st.stop()

# --- 2. Sidebar Filters ---
st.sidebar.header("Global Filters")
available_models = df['model'].unique()
selected_models = st.sidebar.multiselect("Models to Analyze", available_models, default=available_models)
filtered_df = df[df['model'].isin(selected_models)]

# --- 3. Behavioral Drift Tracking ---
st.header("📈 Behavioral Drift")
dates = sorted(df['test_date'].unique(), reverse=True)

if len(dates) > 1:
    latest, previous = dates[0], dates[1]
    st.caption(f"Comparing latest run ({latest}) vs. previous run ({previous})")
    
    # Calculate strictness (removal rate)
    def get_rate(data):
        return data.groupby('model')['verdict'].apply(lambda x: (x == 'REMOVED').mean() * 100)

    latest_rates = get_rate(df[df['test_date'] == latest])
    prev_rates = get_rate(df[df['test_date'] == previous])
    
    m_cols = st.columns(len(selected_models))
    for i, model in enumerate(selected_models):
        curr = latest_rates.get(model, 0)
        prev = prev_rates.get(model, 0)
        diff = curr - prev
        m_cols[i].metric(label=model, value=f"{curr:.1f}%", delta=f"{diff:.1f}%", delta_color="inverse")
else:
    st.info("Drift metrics will appear once a second weekly run is completed.")

# --- 4. The Comparison Duel ---
st.divider()
st.header("⚔️ Moderation Duel")
st.write("Examine differing moderation philosophies for the exact same prompt.")

d_col1, d_col2 = st.columns(2)
with d_col1:
    model_a = st.selectbox("Model A", available_models, index=0)
with d_col2:
    model_b = st.selectbox("Model B", available_models, index=1 if len(available_models) > 1 else 0)

target_p_id = st.selectbox("Select Prompt ID to Compare", df['prompt_id'].unique())

res_a = df[(df['model'] == model_a) & (df['prompt_id'] == target_p_id)].iloc[0]
res_b = df[(df['model'] == model_b) & (df['prompt_id'] == target_p_id)].iloc[0]

# Display Duel Cards
c1, c2 = st.columns(2)
for res, col, name in zip([res_a, res_b], [c1, c2], [model_a, model_b]):
    with col:
        color = "red" if res['verdict'] == "REMOVED" else "green"
        st.markdown(f"### {name}")
        st.markdown(f":{color}[**Verdict: {res['verdict']}**]")
        st.info(f"**Judge Reasoning:**\n{res.get('judge_reasoning', 'N/A')}")
        st.text_area("Full Response", res['response_text'], height=250, key=f"text_{name}")

# --- 5. Category Heatmap ---
st.divider()
st.header("🔥 Categorical Sensitivity Heatmap")
st.write("Darker areas indicate higher restriction levels for specific combinations.")

# Aggregate data for heatmap
heat_data = filtered_df.groupby(['category', 'model'])['verdict'].apply(
    lambda x: (x == 'REMOVED').mean() * 100
).unstack().fillna(0)

fig_heat = px.imshow(
    heat_data,
    labels=dict(x="Model", y="Category", color="Strictness (%)"),
    x=heat_data.columns,
    y=heat_data.index,
    color_continuous_scale="Reds",
    aspect="auto"
)
st.plotly_chart(fig_heat, use_container_width=True)

# --- 6. Raw Data Search ---
with st.expander("🔍 Filterable Raw Data Log"):
    search = st.text_input("Search judge reasoning or responses")
    display_df = filtered_df
    if search:
        display_df = filtered_df[
            filtered_df['judge_reasoning'].str.contains(search, case=False, na=False) |
            filtered_df['response_text'].str.contains(search, case=False, na=False)
        ]
    st.dataframe(display_df[['test_date', 'model', 'category', 'verdict', 'judge_reasoning', 'response_text']], use_container_width=True)

# --- 7. Refusal Personalities (Add this to your app.py) ---
st.divider()
st.header("🎭 Refusal Personalities")
st.write("Does the model refuse bluntly (HARD) or lecture the user (PREACHED)?")

# Filter for only removals to analyze styles
style_df = filtered_df[filtered_df['verdict'] == 'REMOVED']

if not style_df.empty:
    # Bar chart showing style distribution per model
    fig_style = px.histogram(
        style_df, 
        x="model", 
        color="refusal_style", 
        barmode="group",
        color_discrete_map={"HARD": "#ef553b", "SOFT": "#fecb52", "PREACHED": "#636efa"},
        labels={"refusal_style": "Style of Refusal"}
    )
    st.plotly_chart(fig_style, use_container_width=True)
else:
    st.info("No 'REMOVED' events found to analyze refusal styles.")

# --- 8. Over-Refusal Analysis ---
st.divider()
st.header("🎯 Over-Refusal Scorecard")
st.write("Measuring 'False Positives': How often safe prompts are incorrectly blocked.")

# Filter for the 'Expected_Verdict' column if you added it to your CSV
if 'expected_verdict' in df.columns:
    # False Positive = Prompt was Safe ('ALLOWED'), but model said 'REMOVED'
    fp_df = filtered_df[filtered_df['expected_verdict'] == 'ALLOWED']
    
    fp_stats = fp_df.groupby('model')['verdict'].apply(
        lambda x: (x == 'REMOVED').mean() * 100
    ).reset_index(name='False Positive Rate (%)')
    
    col1, col2 = st.columns([2, 1])
    with col1:
        fig_fp = px.bar(fp_stats, x='model', y='False Positive Rate (%)', 
                        title="False Positive Rate (The 'Over-Censorship' Metric)",
                        color_discrete_sequence=['#fecb52'])
        st.plotly_chart(fig_fp, use_container_width=True)
    with col2:
        st.info("**Research Insight:** A high False Positive rate indicates a model that is 'over-aligned'—it favors safety so much that it becomes less useful for benign tasks.")

# --- 9. Refusal Tone Sentiment ---
st.divider()
st.header("🎭 Refusal Sentiment & Tone")
st.write("Does the model apologize for refusing, or is it authoritative?")

tone_data = filtered_df[filtered_df['verdict'] == 'REMOVED'].groupby(['model', 'tone']).size().reset_index(name='count')
fig_tone = px.bar(tone_data, x="tone", y="count", color="model", barmode="group",
                 title="Sentiment of Refusal Responses")
st.plotly_chart(fig_tone, use_container_width=True)

# --- 10. Efficiency Metrics ---
total_cost = filtered_df['total_run_cost'].sum()
st.sidebar.metric("Total Project Cost (Est.)", f"${total_cost:.4f}")
