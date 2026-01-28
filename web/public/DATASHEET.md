# Datasheet for "LLM Content Moderation Audit" Dataset

## Motivation
**Why was this dataset created?**
To quantify the "Alignment Tax" and "Paternalism" in modern Large Language Models (LLMs). Measures how often models refuse benign prompts vs. truly unsafe ones.

**Who created the dataset?**
Maintained by the open-source "LLM Content Moderation Analysis" project.

## Composition
**What do the instances that comprise the dataset represent?**
Each instance is a triplet: `(Prompt, Model_Response, Verdict)`.
*   **Prompts:** Sourced from XSTest (300 benign triggers) plus 200 synthetic sensitive topics (politics, history, sexuality).
*   **Models:** OpenAI (GPT-4o), Anthropic (Claude 3), Google (Gemini 1.5), and open-source alternatives.

**Are there recommended data splits?**
No. This is an evaluation set, not a training set.

## Collection Process
**How was the data acquired?**
Data was collected via automated API auditing scripts (`src/audit_runner.py`) utilizing OpenRouter.ai.
*   **Dates:** 2024-2026.
*   **Region:** US-based IP addresses.

**Were any ethical review processes conducted?**
Yes. The dataset excludes Child Sexual Abuse Material (CSAM) and rigorous non-consensual sexual content. It focuses on borderline political and safety refusals.

## Uses
**Has the dataset been used for any tasks already?**
Yes, to generate the "Alignment Tax" Pareto Frontier and "Political Compass" visualizations.

**What are the prohibited uses?**
*   Do NOT use this dataset to train "Jailbreak" models.
*   Do NOT use to fine-tune models to bypass safety filters indiscriminately.

## Maintenance
**How will the dataset be updated?**
Weekly automated audits (Sundays) update the `audit_log.csv`.
