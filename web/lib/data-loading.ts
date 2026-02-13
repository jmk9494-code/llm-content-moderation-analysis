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


/** Normalize category names so Sexual and Explicit Content are always merged */
function normalizeCategory(cat: string): string {
    if (cat === 'Sexual' || cat === 'Explicit Content') return 'Explicit/Sexual';
    return cat;
}


export async function fetchAuditData(useRecent = false): Promise<AuditRow[]> {
    // Priority 1: audit_log.csv.gz (Compressed ~5.8MB vs 48MB)
    // We use compressed to significantly reduce data transfer.
    console.log("Fetching Audit Data (v5 - Compressed GZIP)...");

    const fileBase = useRecent ? '/audit_recent' : '/audit_log';
    const timestamp = Date.now();

    // Vercel Blob URL for the main audit log
    const BLOB_URL = 'https://oeqbf51ent3zxva1.public.blob.vercel-storage.com/data/audit_log.csv.gz';

    // Try compressed first
    // If not using recent data, use the Blob URL (with cache busting)
    const gzFile = useRecent
        ? `/audit_recent.csv.gz?t=${timestamp}`
        : `${BLOB_URL}?t=${timestamp}`; // Blob URL

    // Fallback for uncompressed (only for local/recent or if blob fails and we want to try local csv?)
    // For simplicity, if Blob fails, we might not have a local fallback if we delete the file.
    // But let's keep the logic consistent.
    const csvFile = useRecent ? `/audit_recent.csv?t=${timestamp}` : `/audit_log.csv?t=${timestamp}`;

    let csvText = '';
    let blocklist = ['yi-34b', 'mistral-medium', 'gpt-audio']; // Default fallback

    try {
        console.log(`Attempting to fetch ${gzFile}...`);

        // Fetch data and blocklist in parallel
        const [dataResponse, blocklistResponse] = await Promise.all([
            fetch(gzFile),
            fetch('/api/blocklist').catch(e => {
                console.warn("Failed to fetch blocklist, using default", e);
                return null;
            })
        ]);

        // Process Blocklist
        if (blocklistResponse && blocklistResponse.ok) {
            try {
                const dynamicBlocklist = await blocklistResponse.json();
                if (Array.isArray(dynamicBlocklist)) {
                    blocklist = dynamicBlocklist;
                    console.log("Loaded dynamic blocklist:", blocklist);
                }
            } catch (e) {
                console.warn("Failed to parse blocklist JSON", e);
            }
        }

        if (dataResponse.ok) {
            // Load full buffer first to avoid stream truncation issues
            const buffer = await dataResponse.arrayBuffer();
            try {
                // Decompress using the browser's native DecompressionStream
                const ds = new DecompressionStream('gzip');
                const writer = ds.writable.getWriter();
                writer.write(buffer);
                writer.close();
                csvText = await new Response(ds.readable).text();
                console.log("Successfully decompressed GZIP data");
            } catch (e) {
                // Fallback: The browser might have already decompressed it transparently
                // or it was plain text to begin with.
                console.warn("Manual decompression failed, trying plain text decode", e);
                csvText = new TextDecoder().decode(buffer);
            }
        } else {
            throw new Error(`GZIP fetch failed: ${dataResponse.status}`);
        }
    } catch (e) {
        console.warn("Compressed data loading failed, falling back to uncompressed", e);
        try {
            console.log(`Fallback: fetching ${csvFile}...`);
            const response = await fetch(csvFile);
            if (response.ok) {
                csvText = await response.text();
            }
        } catch (e2) {
            console.error("Critical: Both compressed and uncompressed data fetch failed", e2);
        }
    }

    if (!csvText) {
        return [];
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
                const refusals = new Map<string, number>();
                const data: AuditRow[] = [];

                // First pass: count models and refusals
                results.data.forEach((row: any) => {
                    const m = String(row.model || row.model_id || '');
                    if (!m) return;
                    counts.set(m, (counts.get(m) || 0) + 1);
                    const v = String(row.verdict || '');
                    if (['REFUSAL', 'REMOVED', 'unsafe', 'Hard Refusal'].includes(v)) {
                        refusals.set(m, (refusals.get(m) || 0) + 1);
                    }
                });

                // User Blocklist: Use the dynamic blocklist fetched earlier
                const BLOCKLIST = blocklist;


                // Second pass: map and filter
                results.data.forEach((row: any) => {
                    const modelName = String(row.model || row.model_id || '');
                    const count = counts.get(modelName) || 0;
                    const refusalCount = refusals.get(modelName) || 0;

                    if (!modelName) return;
                    if (count < 50) return; // Filter noise

                    // If exact match or partial match in blocklist, AND 0 refusals -> skip
                    if (refusalCount === 0 && BLOCKLIST.some(b => modelName.toLowerCase().includes(b))) {
                        return;
                    }

                    const category = normalizeCategory(String(row.category || ''));
                    // Filter out requested categories
                    if (['EdgeCase', 'Jailbreak', 'Multilingual', 'Roleplay'].includes(category)) {
                        return;
                    }

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
                        category: category,
                        verdict: String(row.verdict || getValue('verdict') || ''),
                        prompt: String(row.prompt || row.prompt_text || row.text || row['prompt_text,response_text'] || getValue('prompt_text,response_text') || ''),
                        response: String(row.response || row.response_text || ''),
                        cost: parseFloat(row.cost || row.run_cost) || 0,
                        tokens_used: parseInt(row.tokens_used) || parseInt(row.total_tokens) || 0,
                        latency_ms: parseInt(row.latency_ms) || 0,
                        prompt_id: String(row.prompt_id || row.case_id || ''),
                    });
                });
                console.log(`Loaded ${data.length} rows from CSV (filtered noise and 0% refusals)`);
                resolve(data);
            },
            error: (err: any) => reject(err)
        });
    });
}
