
import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Technical Deep Dive | LLM Censorship Analysis',
    description: 'Forensic analysis of LLM censorship patterns and alignment taxonomies.',
};

export default function DeepDivePage() {
    return (
        <>
            <link rel="stylesheet" href="/css/deep_dive.css" />
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />

            <div className="deep-dive-body">
                {/* Added wrapper class to ensure styles apply if I scoped them, but mostly relying on global-ish css from link */}
                <header className="deep-dive-header">
                    <div className="container">
                        <h1>Technical Deep Dive</h1>
                        <p className="subtitle">Forensic analysis of LLM censorship patterns and alignment taxonomies.</p>
                        <a href="/dashboard" className="back-link">← Return to Dashboard</a>
                    </div>
                </header>

                <main className="container">
                    <section id="academic-figures" className="dashboard-grid">

                        {/* Figure 1: Pareto */}
                        <div className="chart-card">
                            <div className="card-header">
                                <h3>Figure 1: The Alignment Tax</h3>
                                <span className="badge analysis">Pareto Analysis</span>
                            </div>
                            <div className="viz-container">
                                <iframe src="/assets/pareto.html" loading="lazy" title="Alignment Tax Scatter Plot"></iframe>
                            </div>
                            <p className="caption">
                                <strong>Safety vs. Utility.</strong> Models in the top-right quadrant exhibit "Over-censorship" (High Safety on harmful prompts, but Low Utility on benign prompts). The ideal model resides in the top-left (High Utility, High Safety).
                            </p>
                        </div>

                        {/* Figure 2: Heatmap */}
                        <div className="chart-card">
                            <div className="card-header">
                                <h3>Figure 2: Censorship Fingerprint</h3>
                                <span className="badge forensic">Topic Heatmap</span>
                            </div>
                            <div className="viz-container">
                                {/* Displaying PDF in iframe is standard for this type of dense report asset */}
                                <iframe src="/assets/heatmap.pdf" loading="lazy" title="Censorship Heatmap"></iframe>
                            </div>
                            <p className="caption">
                                <strong>Topic Bias.</strong> Red zones indicate systematic censorship on specific categories. Note the variance between models on political categories compared to universal refusal on "Dangerous Content".
                            </p>
                        </div>

                        {/* Figure 3: Clusters */}
                        <div className="chart-card full-width">
                            <div className="card-header">
                                <h3>Figure 3: Semantic Clusters ("The Island of Censorship")</h3>
                                <span className="badge nlp">Embedding Space</span>
                            </div>
                            <div className="viz-container large">
                                <iframe src="/assets/semantic_clusters.html" loading="lazy" title="Semantic Cluster Map"></iframe>
                            </div>
                            <p className="caption">
                                <strong>The Shape of Refusal.</strong> t-SNE/UMAP projection of refusal vectors. "Red Islands" reveal broad conceptual blind spots where models systematically refuse adjacent topics.
                            </p>
                        </div>

                        {/* Figure 4: Word Cloud */}
                        <div className="chart-card">
                            <div className="card-header">
                                <h3>Figure 4: The "Trigger List"</h3>
                                <span className="badge forensic">Vocabulary Analysis</span>
                            </div>
                            <div className="viz-container">
                                <img src="/assets/wordcloud.png" alt="Trigger Word Cloud" loading="lazy" />
                            </div>
                            <p className="caption">
                                <strong>Forbidden Vocabulary.</strong> Terms most frequently associated with 'Hard Refusal' responses. Size corresponds to frequency in refused prompts.
                            </p>
                        </div>

                    </section>

                    <section id="methodology" className="text-section">
                        <h2>Methodology</h2>
                        <p>
                            This analysis utilizes a multi-stage audit pipeline. We evaluate models against
                            <strong>Standardized Benchmarks (XSTest)</strong> for false refusals and a custom
                            <strong>Sensitive Topics</strong> dataset for true refusals.
                        </p>
                        <div className="methodology-metrics">
                            <strong>Metrics:</strong>
                            <ul>
                                <li><em>False Refusal Rate (FRR):</em> Percentage of benign prompts refused.</li>
                                <li><em>True Refusal Rate (TRR):</em> Percentage of harmful prompts refused.</li>
                                <li><em>Preachiness Score:</em> Semantic density of moralizing language in compliant answers.</li>
                            </ul>
                        </div>
                        <div className="links">
                            <a href="https://github.com/jmk9494-code/llm-content-moderation-analysis" target="_blank" rel="noreferrer">View Source Code</a>
                            &bull;
                            <a href="/assets/heatmap.pdf" target="_blank">Download Full Report (PDF)</a>
                        </div>
                    </section>
                </main>

                <footer>
                    <p>&copy; 2026 LLM Content Moderation Analysis Project.</p>
                </footer>
            </div>
        </>
    );
}
