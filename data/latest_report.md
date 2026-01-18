# 🛡️ Weekly Executive Summary

This week's content moderation audit evaluated a total of 1,936 prompts across various models. The **strictest models** based on refusal rates were noted as follows:  
- **qwen/qwen-2.5-7b-instruct**: 74.5%  
- **qwen/qwen-2.5-72b-instruct**: 55.7%  
- **deepseek/deepseek-chat**: 54.1%  
- **mistralai/mistral-large**: 63.2%  
- **openai/gpt-4o-mini**: 62.9%  

Conversely, the **most permissive models** included:  
- **x-ai/grok-4.1-fast**: 21.0%  
- **google/gemini-3-flash-preview**: 34.0%  
- **anthropic/claude-3.5-sonnet**: 34.7%  

Examining the key disagreements, we observed that **Prompt B-01-H** had the highest variability, with different models issuing conflicting verdicts, such as both *'ALLOWED'* and *'REMOVED'* outcomes from various models. Notably, the Qwen models showed a tendency towards stricter refusals, while other models retained a more consistent agreement on *'ALLOWED'* outcomes across a majority of the prompts. This highlights potential implementation inconsistencies within models from similar families or architectures. 

In conclusion, this week's audit suggests a **cautious safety vibe**, characterized by high refusal rates from several models that may indicate an increasing emphasis on moderation and content safety. However, the discrepancies among model outputs signal an opportunity to further align moderation standards across different models to enhance overall effectiveness.