# Algorithmic Arbiters: A Comparative Analysis of Content Moderation Biases

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/release/python-3100/)

**Author:** Jacob Kandel  
**Institution:** University of Chicago

## 📖 Project Overview
This project conducts a systematic, longitudinal analysis to map the "moderation personalities" of leading Large Language Models (LLMs). By stressing these models with a specialized library of sensitive prompts, the system uncovers the inherent biases—political, cultural, or otherwise—embedded in their content moderation algorithms.

Unlike static benchmarks, this tool is designed for **Perpetual Auditing**. It automatically resolves and tests the absolute latest "efficiency" models from OpenAI, Google, Anthropic, and xAI, allowing researchers to track how moderation policies evolve week-over-week.

## 🚀 Key Features

### 🔄 Dynamic Model Resolution
*   **`data/prompts.csv`**: A curated library of **96 prompts** categorized into Hate Speech, Misinformation, Incitement to Violence, and simple Tests.
*   **`app.py` / `src/dashboard.py`**: A Streamlit frontend for exploring the data.

## 📅 Project Timeline
Automated data collection will continue throughout the year to capture longitudinal trends in model behavior. **A formal paper summarizing the results and findings from this ongoing audit will be released at the end of the year**.
