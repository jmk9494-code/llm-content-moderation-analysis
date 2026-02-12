import Papa from 'papaparse';

export type AuditRow = {
    timestamp: string;
    model: string;
    case_id: string;
    category: string;
    verdict: string;
    prompt: string;
    response: string;
    cost: number;
    tokens_used: number;
    latency_ms: number;
    prompt_id?: string; // Analysis page legacy compatibility
};

export async function fetchAuditData(useRecent = false): Promise<AuditRow[]> {
    // Priority 1: audit_log.csv (Uncompressed 48MB - Robust)
    // We use uncompressed to avoid browser-side decompression issues (truncation).
    console.log("Fetching Audit Data (v4 - Uncompressed)...");
    try {
        const file = useRecent ? `/audit_recent.csv?t=${Date.now()}` : `/audit_log.csv?t=${Date.now()}`;
        let response = await fetch(file);

        // If compressed file exists, use it
        if (response.ok) {
            let csvText = '';
            try {
                if (file.endsWith('.gz')) {
                    // Load full buffer first to avoid stream truncation
                    const buffer = await response.arrayBuffer();
                    try {
                        const ds = new DecompressionStream('gzip');
                        const writer = ds.writable.getWriter();
                        writer.write(buffer);
                        writer.close();
                        csvText = await new Response(ds.readable).text();
                    } catch (e) {
                        // Fallback: The browser might have already decompressed it transparently
                        // or it was plain text to begin with.
                        console.warn("Manual decompression failed, trying plain text decode", e);
                        csvText = new TextDecoder().decode(buffer);
                    }
                } else {
                    csvText = await response.text();
                }
            } catch (e) {
                console.warn("CSV data loading failed", e);
                // csvText remains ''
            }

            return new Promise((resolve, reject) => {
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results: any) => {
                        if (!results.data) { resolve([]); return; }
                        // Map CSV data
                        // Dynamically find indices based on actual header names (handling potential quotes)
                        const headers = results.meta.fields || [];
                        const colMap = new Map<string, string>();

                        // Create normalized map
                        headers.forEach((h: string) => {
                            const norm = h.replace(/^["']|["']$/g, '').trim();
                            colMap.set(norm, h);
                        });

                        const counts = new Map<string, number>();
                        const data: AuditRow[] = [];

                        // First pass: count models
                        results.data.forEach((row: any) => {
                            const m = String(row.model || row.model_id || '');
                            if (m) counts.set(m, (counts.get(m) || 0) + 1);
                        });

                        // Second pass: map and filter
                        results.data.forEach((row: any) => {
                            const modelName = String(row.model || row.model_id || '');
                            if (!modelName || (counts.get(modelName) || 0) < 50) return; // Filter noise

                            // Helper to get value ignoring quotes in key
                            const getValue = (key: string) => {
                                const exact = row[key];
                                if (exact !== undefined) return exact;
                                // Try finding mapped key
                                const mapped = colMap.get(key);
                                if (mapped) return row[mapped];
                                // scan keys?
                                return undefined;
                            };

                            data.push({
                                timestamp: String(row.timestamp || row.test_date || row.date || ''),
                                model: modelName,
                                case_id: String(row.case_id || row.prompt_id || row.run_id || ''),
                                category: String(row.category || ''),
                                verdict: String(row.verdict || getValue('verdict') || ''),
                                prompt: String(row.prompt || row.prompt_text || row.text || row['prompt_text,response_text'] || getValue('prompt_text,response_text') || ''),
                                response: String(row.response || row.response_text || ''),
                                cost: parseFloat(row.cost || row.run_cost) || 0,
                                tokens_used: parseInt(row.tokens_used) || parseInt(row.total_tokens) || 0,
                                latency_ms: parseInt(row.latency_ms) || 0,
                                prompt_id: String(row.prompt_id || row.case_id || ''),
                            });
                        });
                        console.log(`Loaded ${data.length} rows from CSV (filtered noise)`);
                        resolve(data);
                    },
                    error: (err: any) => reject(err)
                });
            });
        }
    } catch (e) {
        console.warn("Failed to load compressed CSV, checking fallbacks...", e);
    }

    // Priority 2: traces.json (Fallback)
    try {
        const jsonResponse = await fetch('/assets/traces.json');
        if (jsonResponse.ok) {
            const jsonData = await jsonResponse.json();
            if (Array.isArray(jsonData)) {
                // ... existing JSON mapping logic ...
                const data = jsonData.map((row: any) => ({
                    timestamp: row.timestamp || row.test_date || row.date || new Date().toISOString(),
                    model: row.model || row.model_id || 'Unknown',
                    case_id: row.case_id || row.prompt_id || row.run_id || row.prompt || row.prompt_text || Math.random().toString(36).substring(7),
                    category: row.category || 'Uncategorized',
                    verdict: row.verdict || 'UNKNOWN',
                    prompt: row.prompt || row.prompt_text || row.text || '',
                    response: row.response || row.response_text || '',
                    cost: parseFloat(row.cost || row.run_cost) || 0,
                    tokens_used: parseInt(row.tokens_used) || parseInt(row.total_tokens) || 0,
                    latency_ms: parseInt(row.latency_ms) || 0,
                    prompt_id: row.prompt_id || row.case_id || '',
                })).filter((row: any) => row.model);
                console.log("Loaded data from traces.json (Fallback)");
                return data;
            }
        }
    } catch (e) {
        console.warn("Failed to load traces.json fallback", e);
    }

    throw new Error("No audit data source available.");

    // Legacy fallback (should actally be covered by Priority 1 logic now)
    return [];
}
