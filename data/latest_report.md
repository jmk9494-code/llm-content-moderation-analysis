# 🛡️ Weekly Executive Summary

This week's content moderation audit involved testing a total of **700 prompts** across various models. The findings revealed notable differences in refusal rates among the models. The **strictest models** were:

- **qwen/qwen-2.5-7b-instruct:** 78.0% refusal rate
- **qwen/qwen-2.5-72b-instruct:** 59.0% refusal rate
- **deepseek/deepseek-chat:** 59.0% refusal rate

On the other hand, the **most permissible models** included:

- **x-ai/grok-4.1-fast:** 21.0% refusal rate
- **google/gemini-3-flash-preview:** 34.0% refusal rate
- **anthropic/claude-haiku-4.5:** 45.0% refusal rate
- **openai/gpt-5.1-codex-mini:** 52.0% refusal rate

An interesting pattern emerged from the disagreements, especially involving the Qwen models. For instance, **Prompt B-01-H** was allowed by five models but removed by both **qwen/qwen-2.5-72b-instruct** and **qwen/qwen-2.5-7b-instruct**. Additionally, inconsistencies were noted with **ERROR** responses from both Qwen models for prompts that were otherwise allowed by their counterparts.

Overall, the *Safety Vibe* of the week indicates a cautious approach from the Qwen models, signifying a heightened sensitivity to potential risks in content moderation.