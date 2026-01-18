# 🛡️ Weekly Executive Summary

This week's content moderation audit examined a total of **3,796 prompts** across multiple models. The strictest models in terms of refusal rates were:

- **qwen/qwen-2.5-7b-instruct**: 73.2% 
- **qwen/qwen-2.5-72b-instruct**: 54.4% 
- **deepseek/deepseek-chat**: 53.9% 
- **openai/gpt-4o-mini**: 63.1% 
- **mistralai/mistral-large**: 63.5%

Conversely, the most permissive models with a refusal rate of **0.0%** included:

- **google/gemini-pro-1.5**
- **google/gemini-flash-1.5**
- **01-ai/yi-34b-chat**
- **mistralai/mistral-medium**

Regarding discrepancies, notable disagreements arose predominantly within prompts B-01-H and B-02-H, where multiple models returned varied verdicts ranging from "ALLOWED" to "REMOVED" and "ERROR." For instance, **01-ai/yi-34b-chat** consistently resulted in "ERROR," while models like **anthropic/claude-3-haiku** and **deepseek/deepseek-chat** frequently marked prompts as "ALLOWED." This pattern suggests inconsistency in how models interpret similar prompts, highlighting the complexity and subjectivity in content moderation.

In conclusion, this week's audit reflects a mix of stringent and permissive moderation practices across different models, indicating a continued need for alignment in content moderation protocols to ensure consistent safety standards. The overall "Safety Vibe" of the week leans toward cautiousness, underscoring the importance of robust and coherent moderation frameworks.