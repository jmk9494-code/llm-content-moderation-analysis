# Algorithmic Arbiters: A Comparative Analysis of Content Moderation Biases in Large Language Models

**Project for the University of Chicago's Censorship Course**

**Team Members:**
* Jacob Kandel (JMKANDEL)
* Google Gemini

---

## 1. Project Summary

The rapid integration of Large Language Models (LLMs) like Gemini, ChatGPT, Claude, and Grok into the public information ecosystem has positioned their content moderation systems as de facto regulators of online discourse. However, these moderation systems are often opaque, making it difficult to understand what inherent biases—political, cultural, or otherwise—are embedded in their algorithms and how consistently they apply their own terms of service. This creates a hidden layer of algorithmic censorship that can shape public opinion and access to information without transparent oversight.

Understanding these biases is critical. As millions rely on these tools, their moderation choices can amplify or suppress certain viewpoints, impacting everything from political debate to cultural norms. This project will conduct a systematic, comparative analysis to map the moderation "personalities" of leading LLMs. Our findings will provide a crucial first step towards greater transparency, enabling users to make informed choices, developers to build fairer systems, and policymakers to consider the regulatory landscape of AI-driven communication.

---

## 2. Related Work

Our research builds upon three primary domains of existing literature.

First, we will review studies on **content moderation from the social media era**, examining work on platforms like X (formerly Twitter), Facebook, and YouTube. This will provide a foundational understanding of the challenges of content regulation at scale. Second, we will incorporate research into **algorithmic bias in Natural Language Processing (NLP)**, focusing on studies that have uncovered gender, racial, and political biases in language models. This informs our methodology for probing the models. Finally, we will survey the emerging field of **AI "red teaming" and "jailbreaking,"** where researchers attempt to bypass the safety filters of LLMs.

Our work extends these domains by being, to our knowledge, one of the first direct, comparative studies of content moderation policies across the latest generation of competing, publicly available LLMs using a consistent, systematic methodology.

---

## 3. Project Preparation and Prerequisites

This project is a measurement-based study where the "data" are the generated responses from the LLMs themselves.

**Data Collection:** Our primary task is to develop a comprehensive **Prompt Library**. This library will consist of dozens of carefully crafted prompts designed to test the boundaries of content moderation across several key categories:
* Hate Speech
* Political Misinformation (e.g., related to election integrity, historical events)
* Health & Scientific Misinformation
* Incitement to Violence
* Generation of Sexually Explicit Content

**Methodology:** We will systematically input each prompt into each target model (Grok, Gemini, ChatGPT, Perplexity, Claude). Every prompt-response pair will be logged verbatim in `data/model_responses.csv` to ensure reproducibility. Each prompt will be run multiple times to test for response consistency.

**Expected Results:** We hypothesize that we will find significant variation in the models' responses. We anticipate that some models will be more permissive overall, while others will exhibit specific sensitivities. For example, one model might be highly restrictive regarding political misinformation but more lenient on borderline hate speech, while another model demonstrates the opposite tendency. We plan to present these findings using comparative tables and radar charts to visualize the distinct moderation "personality" of each LLM.

---

## 4. Evaluation

Our evaluation will be primarily qualitative and comparative.

**Analytical Framework:** We will develop a coding scheme to categorize each model's response to a given prompt. The primary categories will be:
* **Direct Refusal:** The model explicitly states it cannot fulfill the request due to safety policies.
* **Evasive Refusal / Lecture:** The model avoids the prompt and provides a lecture on safety or ethics.
* **Partial Fulfillment / Sanitization:** The model answers a sanitized or re-interpreted version of the prompt.
* **Full Compliance:** The model generates the requested content.

**Analysis:** The core of our analysis will be the direct comparison of these coded responses across the different models for the same prompt. This will allow us to draw conclusions about their relative permissiveness and specific biases. We will also analyze the language of the refusals to understand how each model frames its safety policies to the user.

---

## 5. Ethics

We acknowledge several ethical considerations in this work. First, our research will necessarily involve attempting to generate potentially offensive and harmful content. This content will be handled securely, used only for analytical purposes, and will not be disseminated. Second, should we discover significant and easily exploitable "jailbreaks," we will consider the principles of responsible disclosure to the respective AI companies. Finally, we recognize the potential for bias in our own prompt selection and will be transparent about our prompt creation process in our final report to ensure the work is as objective as possible.
