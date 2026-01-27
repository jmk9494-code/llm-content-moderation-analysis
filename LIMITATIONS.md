# Limitations & Ethical Considerations

## 1. Judge Bias and Recursive Evaluation
Our study relies on `gpt-4o-mini` as the primary judge for classifying refusal types. While we implemented position-swapping to mitigate ordering bias, there remains a potential "Self-Preference Bias" where the model may favor responses similar to its own training distribution.

## 2. Stochasticity
LLM outputs are inherently non-deterministic. Although we conducted audits with `N=5` variants per prompt and set `temperature=0.7`, edge cases of transient refusals may persist.

## 3. Scope of Modality
This instrument evaluates **text-only** inputs and outputs. Multimodal safety filters (e.g., image generation refusal) are outside the scope of this work.

## 4. Benchmark Validity
The "Sensitive Topics" dataset is curated based on Western/US-centric political and cultural norms. Results may not generalize to other cultural contexts or value systems.
