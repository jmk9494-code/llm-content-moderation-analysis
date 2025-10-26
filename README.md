# Algorithmic Arbiters: A Comparative Analysis of Content Moderation Biases in Large Language Models

**Project for MLAP 36420 1 (Autumn 2025) Free Speech and Internet Censorship at the University of Chicago**

**Team Members:**
* Jacob Kandel (jmkandel@uchicago.edu)
* Google Gemini


---

## 1. Project Summary

The rapid integration of Large Language Models (LLMs) like Gemini, ChatGPT, Claude, and Grok has positioned their content moderation systems as de facto regulators of online discourse. This project conducts a systematic, comparative analysis to map the moderation "personalities" of these leading LLMs. Our goal is to uncover and document the inherent biases in their application of content policies.

## 2. Methodology

Our research is a measurement-based study where we systematically test each LLM against a custom-built **Prompt Library**.

* **Prompt Library:** Our prompts are categorized into several key areas, including Hate Speech, Political Misinformation, Health & Scientific Misinformation, and Incitement to Violence. The full library can be found in the `/data` directory.
* **Data Collection:** We query each model with each prompt and log the responses verbatim.
* **Analysis:** We perform a qualitative analysis on the responses, coding each one based on a framework of `Direct Refusal`, `Evasive Refusal`, `Partial Fulfillment`, and `Full Compliance`.

## 3. Findings & Results

*[This section will be updated with  key findings, charts, and visualizations as we complete your analysis.]*

## 4. Final Deliverables

* **[Final Paper](./deliverables/final_paper.pdf)**: Our complete 4-6 page project write-up in ACM format.
* **[Video Presentation](https://www.youtube.com/watch?v=your_video_id)**: A brief video summarizing our project and main findings.

## 5. How to Run This Project

*[Optional: If I write scripts for analysis, I will briefly explain how to run them here.]*
