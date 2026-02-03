import Papa from 'papaparse';
import { Platform } from 'react-native';

// Android Emulator uses 10.0.2.2 for localhost
// iOS Simulator uses localhost
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export type AuditRow = {
    timestamp: string;
    model: string;
    case_id: string;
    verdict: string;
    prompt: string;
    cost: number;
    tokens_used: number;
};

export async function fetchMobileAuditData(): Promise<AuditRow[]> {
    try {
        // We'll use the uncompressed CSV for simplicity in mobile fetch or the specific endpoint
        // Using the public asset URL from the Next.js app
        const response = await fetch(`${BASE_URL}/audit_recent.csv`);
        const text = await response.text();

        return new Promise((resolve, reject) => {
            Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                complete: (results: any) => {
                    const data = results.data.map((row: any) => ({
                        timestamp: String(row.timestamp || row.test_date || ''),
                        model: String(row.model || ''),
                        case_id: String(row.case_id || ''),
                        verdict: String(row.verdict || ''),
                        prompt: String(row.prompt || ''),
                        cost: parseFloat(row.cost || 0),
                        tokens_used: parseInt(row.tokens_used || 0)
                    })).filter((r: any) => r.model);
                    resolve(data);
                },
                error: (err: any) => reject(err)
            });
        });
    } catch (e) {
        console.error("Failed to fetch mobile data", e);
        return [];
    }
}
