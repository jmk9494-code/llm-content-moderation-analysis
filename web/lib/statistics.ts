
/**
 * Statistical Analysis Library for Frontend
 * Ported from src/statistics.py
 */

export function calculateFleissKappa(data: any[], models: string[], prompts: string[]): { score: number; interpretation: string } {
    // 1. Create Matrix: Rows = Prompts, Cols = Categories (Allowed, Refusal)
    // Actually Fleiss is for fixed number of raters (models) assigning items (prompts) to categories.
    // Categories: [0: Allowed/Safe, 1: Refusal/Unsafe]

    if (prompts.length === 0 || models.length === 0) return { score: 0, interpretation: 'No data' };

    const n = models.length; // number of raters per subject
    const N = prompts.length; // number of subjects
    const k = 2; // number of categories (Safe vs Unsafe) for simplicity, or we can use raw verdicts

    // Let's use binary classification for now: SAFE vs UNSAFE
    // UNSAFE includes: BLOCK, REFUSAL, REMOVED
    const isUnsafe = (v: string) => ['REFUSAL', 'REMOVED', 'BLOCKED', 'unsafe'].includes(v);

    // Build N x k matrix
    // cell[i][j] = number of raters who assigned category j to subject i
    const matrix: number[][] = []; // N rows

    for (const prompt of prompts) {
        let safeCount = 0;
        let unsafeCount = 0;

        // Find verdicts for this prompt from all models
        // Optimally we'd have a map, but for <10k rows this loop is fine for now
        // We assume 'data' contains all rows
        const promptRows = data.filter(d => d.case_id === prompt || d.prompt === prompt || d.prompt_id === prompt);

        // We need exactly 'n' ratings. If missing, we skip or impute. 
        // For Fleiss, n must be constant. We'll only count models that provide a verdict.

        promptRows.forEach(row => {
            if (models.includes(row.model)) {
                if (isUnsafe(row.verdict)) unsafeCount++;
                else safeCount++;
            }
        });

        // Skip prompts that don't have full responses if we want strict Fleiss, 
        // but for now let's just use what we have, normalized? 
        // Fleiss assumes constant n. We'll just take the counts we found.
        matrix.push([safeCount, unsafeCount]);
    }

    // Calculation
    // P_j = proportion of all assignments to jth category
    let totalAssignments = 0;
    const p_j = [0, 0];

    matrix.forEach(row => {
        const rowTotal = row[0] + row[1];
        if (rowTotal > 0) {
            totalAssignments += rowTotal;
            p_j[0] += row[0];
            p_j[1] += row[1];
        }
    });

    if (totalAssignments === 0) return { score: 0, interpretation: 'No valid ratings' };

    const P_j = p_j.map(x => x / totalAssignments);

    // P_i = extent to which raters agree for the ith subject
    let sum_P_i = 0;
    let validRows = 0;

    matrix.forEach(row => {
        const n_i = row[0] + row[1];
        if (n_i > 1) { // Need at least 2 raters to agree
            const sum_sq = (row[0] * row[0]) + (row[1] * row[1]);
            const Pi = (sum_sq - n_i) / (n_i * (n_i - 1));
            sum_P_i += Pi;
            validRows++;
        }
    });

    if (validRows === 0) return { score: 0, interpretation: 'Insufficient overlap' };

    const P_bar = sum_P_i / validRows;
    const P_e = (P_j[0] * P_j[0]) + (P_j[1] * P_j[1]);

    if (P_e === 1) return { score: 1, interpretation: 'Perfect Agreement' };

    const kappa = (P_bar - P_e) / (1 - P_e);

    return {
        score: kappa,
        interpretation: interpretKappa(kappa)
    };
}

export function interpretKappa(k: number): string {
    if (k < 0) return "Poor agreement";
    if (k < 0.2) return "Slight agreement";
    if (k < 0.4) return "Fair agreement";
    if (k < 0.6) return "Moderate agreement";
    if (k < 0.8) return "Substantial agreement";
    return "Almost perfect agreement";
}

export function calculatePowerAnalysis(effectSize: number, power: number = 0.8, alpha: number = 0.05): number {
    // Simplified approximation: n = (combined_z / effect_size)^2
    // Z_alpha/2 (two tailed) for 0.05 is 1.96
    // Z_beta for 0.8 is 0.84

    // For Cohen's h:
    // N per group = 2 * ( (z_alpha + z_beta) / h )^2

    // Standard Z values
    const z_alpha = 1.96; // for 0.05
    const z_beta = 0.84;  // for 0.80 power

    if (effectSize === 0) return 0;

    const numerator = z_alpha + z_beta;
    const result = 2 * Math.pow(numerator / effectSize, 2);

    return Math.ceil(result);
}

export function calculateCohensH(p1: number, p2: number): number {
    const phi1 = 2 * Math.asin(Math.sqrt(p1));
    const phi2 = 2 * Math.asin(Math.sqrt(p2));
    return Math.abs(phi1 - phi2);
}
