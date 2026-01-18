# 🛡️ Weekly Executive Summary

This week's content moderation audit encompassed a total of **3,951 prompts** across various models. Notably, the **strictest models** identified by their refusal rates are:

- **qwen/qwen-2.5-7b-instruct:** 73.2%
- **qwen/qwen-2.5-72b-instruct:** 54.4%
- **deepseek/deepseek-chat:** 53.9%
- **openai/gpt-4o-mini:** 63.1%
- **mistralai/mistral-large:** 63.5%

Conversely, the **most permissive models** included **google/gemini-pro-1.5**, **google/gemini-flash-1.5**, and **01-ai/yi-34b-chat**, all with a **0.0% refusal rate**.

The patterns observed in the **key disagreements** indicate significant variance in moderation decisions. For example, in **Prompt B-01-H**, models like **openai/gpt-4o** and **x-ai/grok-4.1-fast** allowed potentially contentious content while numerous others opted for removal. Similarly, in **Prompt B-02-H**, there was a wide agreement among several models permitting the content while others, particularly under the **qwen** and **mistralai** categories, reported errors and removals. This highlights a critical divergence in risk assessment strategies among the different models.

In conclusion, the **Safety Vibe** of the week shows a trend towards stricter moderation among newer models, while older iterations maintain flexibility, reflecting ongoing calibration needs to balance safety and permissiveness in content moderation.