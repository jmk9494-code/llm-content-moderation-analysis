import streamlit as st

def inject_m3_style():
    """Injects high-fidelity Material 3 design tokens and global styles."""
    st.markdown("""
        <style>
        /* Import Google Fonts: Roboto */
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap');
        
        /* --- M3 Color Palette (Deep Purple & Lavender) --- */
        :root {
            --md-sys-color-primary: #6750A4;
            --md-sys-color-primary-container: #EADDFF;
            --md-sys-color-on-primary-container: #21005D;
            --md-sys-color-secondary: #625B71;
            --md-sys-color-secondary-container: #E8DEF8;
            --md-sys-color-background: #FEF7FF;
            --md-sys-color-surface: #FEF7FF;
            --md-sys-color-surface-container: #F3EDF7;
            --md-sys-color-surface-variant: #E7E0EC;
            --md-sys-color-on-surface: #1D1B20;
            --md-sys-color-outline: #79747E;
        }

        /* --- Global Resets & Typography --- */
        html, body, [class*="css"] {
            font-family: 'Roboto', sans-serif;
            color: var(--md-sys-color-on-surface);
            background-color: var(--md-sys-color-background);
        }
        
        h1, h2, h3 {
            font-weight: 500;
            color: var(--md-sys-color-on-surface);
            margin-bottom: 16px;
        }

        /* --- Layout & Containers --- */
        /* Main background */
        .stApp {
            background-color: var(--md-sys-color-background);
        }

        /* Sidebar styling */
        section[data-testid="stSidebar"] {
            background-color: var(--md-sys-color-surface-container);
            border-right: 1px solid var(--md-sys-color-surface-variant);
        }

        /* --- Card Styling (The core M3 look) --- */
        /* Affects DataFrames, Metrics, Charts, Expanders */
        .stDataFrame, .stPlotlyChart, div[data-testid="stMetric"], .stExpander, div[data-testid="stMarkdownContainer"] > div[data-testid="stCard"] {
            background-color: #FFFFFF; /* Pure white for contrast against lavender bg */
            border-radius: 16px;
            border: 1px solid var(--md-sys-color-surface-variant);
            padding: 24px;
            box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.05);
            transition: box-shadow 0.2s ease-in-out;
            margin-bottom: 20px;
        }
        
        .stDataFrame:hover, .stPlotlyChart:hover, div[data-testid="stMetric"]:hover {
            box-shadow: 0px 4px 8px 3px rgba(0, 0, 0, 0.15); /* M3 Elevation 2 */
        }

        /* --- Custom Metric Card CSS Class --- */
        .m3-metric-card {
            background-color: #FFFFFF;
            border-radius: 16px;
            padding: 20px;
            border: 1px solid var(--md-sys-color-surface-variant);
            box-shadow: 0px 1px 3px 0px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        
        .m3-metric-value {
            font-size: 32px;
            font-weight: 700;
            color: var(--md-sys-color-primary);
        }
        
        .m3-metric-label {
            font-size: 14px;
            font-weight: 500;
            color: var(--md-sys-color-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .m3-metric-delta {
            font-size: 12px;
            color: var(--md-sys-color-outline);
            margin-top: 4px;
        }

        /* --- Tabs --- */
        button[data-baseweb="tab"] {
            font-family: 'Roboto', sans-serif;
            font-weight: 500;
            border-radius: 20px !important;
            padding: 0px 24px;
        }
        
        /* Icon Utility */
        .material-symbols-outlined {
            vertical-align: bottom;
            font-size: 24px;
            margin-right: 8px;
        }
        
        </style>
    """, unsafe_allow_html=True)

def m3_metric_card(label, value, delta=None, help_text=None):
    """Renders a custom HTML/CSS Metric Card congruent with M3."""
    delta_html = f"<div class='m3-metric-delta'>{delta}</div>" if delta else ""
    help_html = f"title='{help_text}'" if help_text else ""
    
    html = f"""
    <div class='m3-metric-card' {help_html}>
        <div class='m3-metric-label'>{label}</div>
        <div class='m3-metric-value'>{value}</div>
        {delta_html}
    </div>
    """
    st.markdown(html, unsafe_allow_html=True)
