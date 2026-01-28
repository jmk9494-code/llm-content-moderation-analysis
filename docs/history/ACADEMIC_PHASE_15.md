# ACADEMIC_PHASE_15: Synthesis & Writing Support

## Objective
Measure the "Cost of Refusal" (economic/latency impact), determine the depth of censorship (Deep vs. Shallow), and auto-generate the paper's abstract.

## Step 1: The "Nagging Tax" Calculator
**Goal**: Quantify "Wasted Tokens" per refusal.

*   **Script**: `analysis/economic_impact.py`
*   **Logic**:
    1.  Load `web/public/assets/traces.json`.
    2.  Filter for `verdict` == "REFUSAL" (or similar).
    3.  Calculate token count (approx `len(text) / 4`).
    4.  **Metric**: Mean Tokens per Refusal per Model.
    5.  **Visualization**: Bar chart saved to `paper/figures/nagging_tax.png` (and `.pdf`).

## Step 2: The "Deep vs. Shallow" Test (Ablation)
**Goal**: Determine if alignment is prompt-based (Shallow) or weight-based (Deep).

*   **Script**: `analysis/system_prompt_ablation.py`
*   **Logic**:
    1.  Identify Top 20 most refused topics from previous runs.
    2.  Run audit on these topics **WITHOUT** a system prompt (or use a neutral one).
    3.  Compare new Refusal Rate vs. Baseline.
    4.  **Result**:
        *   Drop in Refusal -> Shallow.
        *   Steady Refusal -> Deep.
    5.  **Output**: Save stats to `web/public/assets/ablation_stats.json`.

## Step 3: The "Auto-Writer" (Abstract Generator)
**Goal**: Generate a fill-in-the-blank abstract for the paper.

*   **Script**: `reporting/generate_abstract.py` (wrapped by `scripts/generate_paper_stats.py`)
*   **Logic**:
    1.  Load `web/public/assets/traces.json` (General Stats).
    2.  Load `web/public/assets/ablation_stats.json` (Ablation Stats).
    3.  Load `web/public/assets/drift.html` (or parsing source data for history).
    4.  Compute:
        *   Most Censored Model.
        *   "Nagging Tax" (Avg tokens per refusal).
        *   Refusal Drop (from Ablation).
    5.  **Output**: Print the specific formatted abstract text to console.

## Execution
Run `python scripts/generate_paper_stats.py` to trigger the abstract generation (and potentially run the analysis steps if not already done).
