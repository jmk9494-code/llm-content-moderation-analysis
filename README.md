# Algorithmic Arbiters: A Comparative Analysis of Content Moderation Biases

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/release/python-3100/)

**Author:** Jacob Kandel
**Institution:** University of Chicago

## 📖 Project Overview
This project conducts a systematic, comparative analysis to map the "moderation personalities" of leading Large Language Models (LLMs) including **GPT-4o, Gemini 1.5, Claude 3.5, Llama 3, and Grok**. By stressing these models with a specialized library of 96 sensitive prompts, the system uncovers the inherent biases—political, cultural, or otherwise—embedded in their content moderation algorithms.

## 🔄 The Perpetual Audit System
This repository functions as an autonomous, long-term research tool designed to monitor how model moderation philosophies evolve over time.

### **1. Automated Execution**
* **Weekly Audits**: A GitHub Actions workflow is configured to run indefinitely, triggering automatically every Monday at midnight UTC.
* **Autonomous Pipeline**: Each weekly run triggers the collection of new model responses, performs automated analysis, and commits updated results (CSVs and JSONs) back to the repository without manual intervention.

### **2. Dynamic Model Discovery**
* **Real-Time Selection**: The system utilizes a custom model selector that queries the OpenRouter API at the start of every run to auto-discover the latest available efficiency models.
* **Intelligent Filtering**: It follows predefined "family rules" to ensure it always targets the most current versions of key model lines—such as OpenAI's GPT-mini, Google's Gemini Flash, Anthropic's Claude Haiku, Meta's Llama, and xAI's Grok—based on their creation date.

## 🛠️ Project Components
* **Prompt Library**: A curated set of **96 prompts** categorized into Hate Speech, Political Misinformation, Health & Scientific Misinformation, Incitement to Violence, and Sexually Explicit Content.
* **Dual-Layer Analysis**: The system uses an asynchronous engine to collect responses and a secondary "Judge" model (`gemini-2.0-flash`) to categorize verdicts (e.g., ALLOWED or REMOVED) and evaluate the "preachy" score of each response.
* **Interactive Dashboard**: A Streamlit-based interface provides persona profiles, longitudinal tracking of model drift over time, and cost-efficiency analysis.

## 🚀 Technical Implementation
* **Language**: Python 3.10+.
* **Concurrency**: Built with `AsyncIO` and semaphores to handle high-volume parallel API calls efficiently while staying within rate limits.
* **Frontend**: Custom Streamlit application utilizing Material 3 styling for clear data visualization.

## 📅 Project Timeline
Automated data collection will continue throughout the year to capture longitudinal trends in model behavior. **A formal paper summarizing the results and findings from this ongoing audit will be released at the end of the year**.
