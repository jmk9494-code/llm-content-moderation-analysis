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

export async function fetchAuditData(useRecent = true): Promise<AuditRow[]> {
    try {
        // Priority 1: traces.json (The new standard, redacted & safe)
        try {
            const jsonResponse = await fetch('/assets/traces.json');
            if (jsonResponse.ok) {
                const jsonData = await jsonResponse.json();
                if (Array.isArray(jsonData)) {
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
                    console.log("Loaded data from traces.json");
                    return data;
                }
            }
        } catch (e) {
            console.warn("Failed to load traces.json, falling back to CSV", e);
        }

        const file = useRecent ? '/audit_recent.csv' : '/audit_log.csv.gz';
        let response = await fetch(file);

        // Fallback to uncompressed if .gz missing
        if (!response.ok) {
            console.warn(`Compressed file ${file} not found, falling back to .csv`);
            response = await fetch('/audit_log.csv');
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch audit log: ${response.statusText}`);
        }

        let csvText = '';
        if (response.headers.get('Content-Type')?.includes('gzip') || file.endsWith('.gz')) {
            // Decompress stream
            const ds = new DecompressionStream('gzip');
            const decompressedStream = response.body?.pipeThrough(ds);
            if (decompressedStream) {
                csvText = await new Response(decompressedStream).text();
            } else {
                csvText = await response.text(); // Fallback
            }
        } else {
            csvText = await response.text();
        }

        return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                complete: (results: any) => {
                    if (!results.data) {
                        resolve([]);
                        return;
                    }

                    // Map to expected format - handle various CSV column naming conventions
                    // Logic ported from previous API route to ensure consistency
                    const data = results.data.map((row: any) => ({
                        timestamp: String(row.timestamp || row.test_date || row.date || ''),
                        model: String(row.model || row.model_id || ''),
                        case_id: String(row.case_id || row.prompt_id || row.run_id || ''),
                        category: String(row.category || ''),
                        verdict: String(row.verdict || ''),
                        prompt: String(row.prompt || row.prompt_text || row.text || ''),
                        response: String(row.response || row.response_text || ''),
                        cost: parseFloat(row.cost || row.run_cost) || 0,
                        tokens_used: parseInt(row.tokens_used) || parseInt(row.total_tokens) || 0,
                        latency_ms: parseInt(row.latency_ms) || 0,
                        prompt_id: String(row.prompt_id || row.case_id || ''), // Backward compatibility
                    })).filter((row: any) => row.model) // Filter out rows without model
                        .map((row: any) => {
                            // Attempt to extract inner verdict if available (for moderation benchmarks)
                            // If the outer verdict is 'ALLOWED' (API success), but the model said "REMOVED", we want "REMOVED"
                            if (row.verdict === 'ALLOWED' && row.response && row.response.trim().startsWith('{')) {
                                try {
                                    const inner = JSON.parse(row.response);
                                    if (inner.verdict) {
                                        row.verdict = inner.verdict;
                                    }
                                } catch (e) {
                                    // Failed to parse JSON, keep original verdict
                                }
                            }
                            return row;
                        });

                    resolve(data);
                },
                error: (error: any) => {
                    reject(error);
                }
            });
        });
    } catch (error) {
        console.error("Error loading audit data:", error);
        throw error;
    }
}
