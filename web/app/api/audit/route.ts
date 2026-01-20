import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import Papa from 'papaparse';

export async function GET() {
    try {
        // Read the CSV file from the public directory
        const csvPath = path.join(process.cwd(), 'public', 'audit_log.csv');

        if (!fs.existsSync(csvPath)) {
            console.error(`CSV file not found at ${csvPath}`);
            return NextResponse.json({ error: 'Data file not found' }, { status: 500 });
        }

        const csvContent = fs.readFileSync(csvPath, 'utf-8');

        // Parse CSV
        const parsed = Papa.parse(csvContent, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true
        });

        if (parsed.errors.length > 0) {
            console.error('CSV parsing errors:', parsed.errors);
        }

        // Transform the data to match the expected format
        const rows = parsed.data.map((row: any) => ({
            timestamp: row.test_date || row.timestamp,
            model: row.model,
            case_id: row.prompt_id || row.case_id,
            category: row.category,
            verdict: row.verdict,
            prompt: row.prompt_text || row.prompt,
            response: row.response_text || row.response,
            cost: row.run_cost || row.cost,
            latency_ms: row.latency_ms,
            tokens_used: row.tokens_used
        }));

        return NextResponse.json({ data: rows });
    } catch (error) {
        console.error('Failed to read CSV:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
