
/**
 * Statistical Analysis Library for Frontend
 * Ported from src/statistics.py
 */

export function calculateFleissKappa(
    dataOrMap: any[] | Map<string, any[]>,
    models: string[],
    prompts: string[]
): { score: number; interpretation: string } {
    if (prompts.length === 0 || models.length === 0) return { score: 0, interpretation: 'No data' };

    const k = 2; // Safe vs Unsafe
    const isUnsafe = (v: string) => ['REFUSAL', 'REMOVED', 'BLOCKED', 'unsafe', 'Hard Refusal'].includes(v);
    const matrix: number[][] = [];

    // Optimization: Use provided map or build it
    let rowsByPrompt: Map<string, any[]>;
    if (dataOrMap instanceof Map) {
        rowsByPrompt = dataOrMap;
    } else {
        rowsByPrompt = new Map<string, any[]>();
        for (const row of dataOrMap) {
            const id = row.case_id || row.prompt || row.prompt_id;
            if (!id) continue;
            if (!rowsByPrompt.has(id)) rowsByPrompt.set(id, []);
            rowsByPrompt.get(id)!.push(row);
        }
    }

    // Iterate prompts to build matrix
    // If matrix building is slow, we can optimize, but loop over prompts (N=1000) is fast.
    for (const prompt of prompts) {
        let safeCount = 0;
        let unsafeCount = 0;

        const promptRows = rowsByPrompt.get(prompt);
        if (!promptRows) continue;

        // Optimized inner loop: direct count
        for (const row of promptRows) {
            // If models list is huge, this .includes check is O(M). 
            // But models list is usually small (2-20). If large, use Set.
            if (models.includes(row.model)) {
                if (isUnsafe(row.verdict)) unsafeCount++;
                else safeCount++;
            }
        }

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
