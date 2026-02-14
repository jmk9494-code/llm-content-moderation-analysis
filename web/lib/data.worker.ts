/* eslint-disable no-restricted-globals */
import Papa from 'papaparse';

// Define types locally since sharing types with worker can be tricky without shared file
type AuditRow = {
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
    prompt_id?: string;
};

// Listen for messages from the main thread
self.onmessage = async (e: MessageEvent) => {
    const { useRecent, lite } = e.data;

    try {
        const data = await fetchAndParseData(useRecent, lite);
        self.postMessage({ type: 'SUCCESS', data });
    } catch (error) {
        self.postMessage({ type: 'ERROR', error: String(error) });
    }
};

/** Normalize category names so Sexual and Explicit Content are always merged */
function normalizeCategory(cat: string): string {
    if (cat === 'Sexual' || cat === 'Explicit Content') return 'Explicit/Sexual';
    return cat;
}

async function fetchAndParseData(useRecent: boolean, lite: boolean): Promise<AuditRow[]> {
    const version = lite ? 'Lite' : 'Full';
    console.log(`[Worker] Fetching Audit Data (v5 - Compressed GZIP - ${version})...`);

    const timestamp = Date.now();
    const blobName = lite ? 'audit_log_lite.csv.gz' : 'audit_log.csv.gz';
    // Use the public blob URL directly here to avoid passing env vars complexities if possible, 
    // or pass it from main thread. For now, hardcode or pass via message.
    // Assuming prod URL for simplicity or relative if on same origin.
    // Actually, worker origin might be different? 
    // Let's use relative path for local dev fallback and absolute for prod.

    // We can use the same logic:
    // But process.env might not be available in worker in same way depending on bundler.
    // Let's rely on the URL passed from main thread? 
    // Or just use the hardcoded logic which seems to use relative paths in dev.

    // Hardcoded logic for now:
    let BLOB_URL = `https://oeqbf51ent3zxva1.public.blob.vercel-storage.com/data/${blobName}`;
    if (self.location.hostname === 'localhost') {
        BLOB_URL = `/${blobName}`;
    }

    const gzFile = useRecent
        ? `/audit_recent.csv.gz?t=${timestamp}`
        : `${BLOB_URL}?t=${timestamp}`;

    const csvFile = useRecent ? `/audit_recent.csv?t=${timestamp}` : `/audit_log.csv?t=${timestamp}`;

    let csvText = '';
    let blocklist = ['yi-34b', 'mistral-medium', 'gpt-audio'];

    try {
        // Fetch blocklist first (or we could pass it from main thread)
        // Let's try fetching it here.
        try {
            const blocklistResponse = await fetch('/api/blocklist');
            if (blocklistResponse.ok) {
                const dynamicBlocklist = await blocklistResponse.json();
                if (Array.isArray(dynamicBlocklist)) blocklist = dynamicBlocklist;
            }
        } catch (e) {
            console.warn("[Worker] Failed to fetch blocklist", e);
        }

        const dataResponse = await fetch(gzFile);
        if (dataResponse.ok) {
            const buffer = await dataResponse.arrayBuffer();
            try {
                const ds = new DecompressionStream('gzip');
                const writer = ds.writable.getWriter();
                writer.write(buffer);
                writer.close();
                csvText = await new Response(ds.readable).text();
            } catch (e) {
                console.warn("[Worker] Manual decompression failed, trying plain text decode", e);
                csvText = new TextDecoder().decode(buffer);
            }
        } else {
            // Fallback
            console.warn("[Worker] GZIP fetch failed, trying uncompressed");
            const response = await fetch(csvFile);
            if (response.ok) csvText = await response.text();
        }
    } catch (e) {
        console.error("[Worker] Data load failed", e);
        throw e;
    }

    if (!csvText) return [];

    return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
                if (!results.data) { resolve([]); return; }

                const headers = results.meta.fields || [];
                const colMap = new Map<string, string>();
                headers.forEach((h: string) => {
                    const norm = h.replace(/^["']|["']$/g, '').trim();
                    colMap.set(norm, h);
                });

                const counts = new Map<string, number>();
                const refusals = new Map<string, number>();
                const data: AuditRow[] = [];

                results.data.forEach((row: any) => {
                    const m = String(row.model || row.model_id || '');
                    if (!m) return;
                    counts.set(m, (counts.get(m) || 0) + 1);
                    const v = String(row.verdict || '');
                    if (['REFUSAL', 'REMOVED', 'unsafe', 'Hard Refusal'].includes(v)) {
                        refusals.set(m, (refusals.get(m) || 0) + 1);
                    }
                });

                const BLOCKLIST = blocklist;

                results.data.forEach((row: any) => {
                    const modelName = String(row.model || row.model_id || '');
                    const count = counts.get(modelName) || 0;
                    const refusalCount = refusals.get(modelName) || 0;

                    if (!modelName) return;
                    if (count < 50) return;
                    if (refusalCount === 0 && BLOCKLIST.some(b => modelName.toLowerCase().includes(b))) return;

                    const category = normalizeCategory(String(row.category || ''));
                    if (['EdgeCase', 'Jailbreak', 'Multilingual', 'Roleplay'].includes(category)) return;

                    const getValue = (key: string) => {
                        const exact = row[key];
                        if (exact !== undefined) return exact;
                        const mapped = colMap.get(key);
                        if (mapped) return row[mapped];
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

                resolve(data);
            },
            error: (err: any) => reject(err)
        });
    });
}
