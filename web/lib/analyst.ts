
import { AuditRow } from "./schemas";

export function generateReport(data: AuditRow[], filters: { region?: string; tier?: string }): string {
    if (!data || data.length === 0) return "No data available for analysis.";

    const total = data.length;
    const models = Array.from(new Set(data.map((r) => r.model)));
    const refusals = data.filter((r) => r.verdict === "REMOVED").length;
    const refusalRate = ((refusals / total) * 100).toFixed(1);

    // 1. Identify Most Restrictive Model
    const modelStats = models.map((m) => {
        const subset = data.filter((r) => r.model === m);
        const mRefusals = subset.filter((r) => r.verdict === "REMOVED").length;
        return {
            model: m.split("/")[1] || m,
            rate: (mRefusals / subset.length) * 100,
        };
    });

    const mostStrict = modelStats.reduce((prev, curr) => (prev.rate > curr.rate ? prev : curr), { rate: -1, model: "" });
    const leastStrict = modelStats.reduce((prev, curr) => (prev.rate < curr.rate ? prev : curr), { rate: 101, model: "" });

    // 2. Identify Most Censored Category
    const categories = Array.from(new Set(data.map((r) => r.category)));
    const catStats = categories.map((c) => {
        const subset = data.filter((r) => r.category === c);
        const cRefusals = subset.filter((r) => r.verdict === "REMOVED").length;
        return {
            category: c,
            rate: subset.length ? (cRefusals / subset.length) * 100 : 0,
        };
    });

    const mostCensoredCat = catStats.reduce((prev, curr) => (prev.rate > curr.rate ? prev : curr), { rate: -1, category: "" });

    const regionText = filters.region && filters.region !== 'All' ? ` in the **${filters.region}** region` : "";

    return `
## Real-Time Refusal Analysis

Based on the current dataset${regionText}, we analyzed **${total}** prompts across **${models.length}** AI models.

### 🚨 Key Findings

*   **Overall Freedom Score**: The models allowed **${(100 - Number(refusalRate)).toFixed(1)}%** of prompts, while restricting **${refusalRate}%**.
*   **Most Restrictive Model**: **${mostStrict.model}** is the most heavily censored model in this view, refusing **${mostStrict.rate.toFixed(1)}%** of all prompts.
*   **Most Free Model**: **${leastStrict.model}** proved to be the most permissible, with a refusal rate of only **${leastStrict.rate.toFixed(1)}%**.
*   **Sensitive Topic**: The category **${mostCensoredCat.category}** triggered the highest rate of refusals (**${mostCensoredCat.rate.toFixed(1)}%** refusals).

### 💡 Analyst Notes
${Number(refusalRate) > 15
            ? "This segment of the model landscape shows **significant restrictions** on speech. Models here are highly sensitive to safety guidelines, potentially at the cost of utility."
            : "This segment appears relatively **free and open**. Most models focused on answering user queries rather than policing content."}

${mostStrict.rate > 50 ? `The high refusal rate of ${mostStrict.model} suggests it may be over-tuned for safety, potentially leading to 'refusal fatigue' for benign queries.` : ""}
`;
}
