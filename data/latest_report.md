# 🛡️ Weekly Executive Summary

This week's audit of content moderation revealed significant variation in refusal rates among the models tested. The strictest models were:

- **qwen/qwen-2.5-7b-instruct**: 73.3% refusal rate
- **deepseek/deepseek-chat**: 53.6% refusal rate
- **openai/gpt-4o-mini**: 62.5% refusal rate
- **mistralai/mistral-large**: 63.5% refusal rate

In contrast, the most permissible models, exhibiting zero refusal rate, included:

- **google/gemini-pro-1.5**
- **google/gemini-flash-1.5**
- **01-ai/yi-34b-chat**
- **mistralai/mistral-medium**

The audit also highlighted interesting patterns in disagreement. Notably, models often exhibited a trend of varying refusal outcomes based on their specific contexts, particularly in prompts where contentious material was at play. For instance, in **Prompt B-01-H**, several models allowed the content, while others, including various Anthropics and Qwen models, opted to remove it, indicating possible inconsistency in handling sensitive material. Such divergent verdicts underscore the necessity for harmonized content moderation standards across different AI models.

In conclusion, the safety vibe this week indicates a discernable split in models' readiness to moderate content. As we continue to refine our oversight mechanisms, it is imperative to understand and address these variances to enhance overall safety and compliance.