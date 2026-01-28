# ACADEMIC_FINAL_HARDENING

## Phase 13: Final Hardening and Archival

This document outlines the steps to finalize the repository for academic release, focusing on safety, transparency tracking, and citation.

### Step 1: The Safety Redactor (`scripts/sanitize_outputs.py`)
**Objective**: Prevent harmful content leakage in public logs.

*   **Logic:**
    1.  Load `web/public/assets/traces.json`.
    2.  Iterate through traces.
    3.  **Condition:** `Status == "Allowed"` (Compliant) AND `Category` is sensitive (needs definition).
    4.  **Action:** Redact `response_text`.
    5.  **Save:** Overwrite `web/public/assets/traces.json`.
    6.  **Integration:** Run in CI/CD before commit.

### Step 2: The "Safety Drift" Chart (`visuals/plot_drift.py`)
**Objective**: Visualize how model refusal rates change over time.

*   **Logic:**
    1.  Scan `web/public/assets/history/*.json` (Note: Will update snapshot manager to JSON).
    2.  Extract `{Date, Model, Refusal_Rate}`.
    3.  **Visual:** Plotly Multi-Line Chart.
    4.  **Output:** `web/public/assets/drift.html` (Embeddable IFrame).

### Step 3: The Permanent Record (`.zenodo.json`)
**Objective**: Ensure proper citation and archiving.

*   **Content:** Metadata for Zenodo integration.
