/**
 * Statistical utilities for data analysis
 * Provides confidence intervals, significance testing, and trend analysis
 */

/**
 * Calculate 95% confidence interval for a proportion using Wilson score interval
 * More accurate than normal approximation, especially for small samples
 */
export function calculateConfidenceInterval(
    successes: number,
    total: number,
    confidenceLevel: number = 0.95
): { lower: number; upper: number; margin: number } {
    if (total === 0) {
        return { lower: 0, upper: 0, margin: 0 };
    }

    const p = successes / total;
    const z = confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.99 ? 2.576 : 1.645;

    // Wilson score interval
    const denominator = 1 + (z * z) / total;
    const center = (p + (z * z) / (2 * total)) / denominator;
    const margin = (z / denominator) * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total));

    return {
        lower: Math.max(0, (center - margin) * 100),
        upper: Math.min(100, (center + margin) * 100),
        margin: margin * 100
    };
}

/**
 * Perform chi-square test for independence between two categorical variables
 * Returns p-value indicating statistical significance
 */
export function chiSquareTest(
    observed1: { successes: number; failures: number },
    observed2: { successes: number; failures: number }
): { chiSquare: number; pValue: number; significant: boolean } {
    const n1 = observed1.successes + observed1.failures;
    const n2 = observed2.successes + observed2.failures;
    const total = n1 + n2;

    if (total === 0) {
        return { chiSquare: 0, pValue: 1, significant: false };
    }

    const totalSuccesses = observed1.successes + observed2.successes;
    const totalFailures = observed1.failures + observed2.failures;

    // Expected values
    const expected1Successes = (n1 * totalSuccesses) / total;
    const expected1Failures = (n1 * totalFailures) / total;
    const expected2Successes = (n2 * totalSuccesses) / total;
    const expected2Failures = (n2 * totalFailures) / total;

    // Chi-square statistic
    const chiSquare =
        Math.pow(observed1.successes - expected1Successes, 2) / expected1Successes +
        Math.pow(observed1.failures - expected1Failures, 2) / expected1Failures +
        Math.pow(observed2.successes - expected2Successes, 2) / expected2Successes +
        Math.pow(observed2.failures - expected2Failures, 2) / expected2Failures;

    // Approximate p-value using chi-square distribution (df=1)
    // Using simplified approximation for df=1
    const pValue = 1 - erf(Math.sqrt(chiSquare / 2));

    return {
        chiSquare,
        pValue,
        significant: pValue < 0.05
    };
}

/**
 * Error function approximation for p-value calculation
 */
function erf(x: number): number {
    // Abramowitz and Stegun approximation
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
}

/**
 * Get significance level indicator
 */
export function getSignificanceIndicator(pValue: number): string {
    if (pValue < 0.001) return '***';
    if (pValue < 0.01) return '**';
    if (pValue < 0.05) return '*';
    return '';
}

/**
 * Calculate linear regression for trend line
 */
export function calculateLinearRegression(
    data: { x: number; y: number }[]
): {
    slope: number;
    intercept: number;
    rSquared: number;
    predict: (x: number) => number;
} {
    if (data.length < 2) {
        return {
            slope: 0,
            intercept: 0,
            rSquared: 0,
            predict: () => 0
        };
    }

    const n = data.length;
    const sumX = data.reduce((sum, point) => sum + point.x, 0);
    const sumY = data.reduce((sum, point) => sum + point.y, 0);
    const sumXY = data.reduce((sum, point) => sum + point.x * point.y, 0);
    const sumXX = data.reduce((sum, point) => sum + point.x * point.x, 0);
    const sumYY = data.reduce((sum, point) => sum + point.y * point.y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R²
    const meanY = sumY / n;
    const ssTotal = data.reduce((sum, point) => sum + Math.pow(point.y - meanY, 2), 0);
    const ssResidual = data.reduce(
        (sum, point) => sum + Math.pow(point.y - (slope * point.x + intercept), 2),
        0
    );
    const rSquared = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;

    return {
        slope,
        intercept,
        rSquared,
        predict: (x: number) => slope * x + intercept
    };
}

/**
 * Format confidence interval for display
 */
export function formatCI(lower: number, upper: number): string {
    return `[${lower.toFixed(1)}%, ${upper.toFixed(1)}%]`;
}

/**
 * Calculate Cohen's h for effect size between two proportions
 */
export function cohensH(p1: number, p2: number): number {
    const phi1 = 2 * Math.asin(Math.sqrt(p1));
    const phi2 = 2 * Math.asin(Math.sqrt(p2));
    return Math.abs(phi1 - phi2);
}

/**
 * Interpret effect size
 */
export function interpretEffectSize(h: number): string {
    if (h < 0.2) return 'negligible';
    if (h < 0.5) return 'small';
    if (h < 0.8) return 'medium';
    return 'large';
}
