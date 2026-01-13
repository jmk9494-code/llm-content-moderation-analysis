import streamlit as st
import pandas as pd
import glob
import plotly.express as px

st.set_page_config(page_title="Advanced LLM Moderation Tracker", layout="wide")

st.title("🛡️ Advanced LLM Content Moderation Analytics")
st.markdown("Automated tracking of model behavior, policy drift, and categorical sensitivity.")

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
