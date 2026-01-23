import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

export async function GET() {
    try {
        // Read from CSV file in public folder
        const csvPath = path.join(process.cwd(), 'public', 'audit_log.csv');

        if (!fs.existsSync(csvPath)) {
            return NextResponse.json({ data: [], error: 'No audit data found' });
        }

        const csvContent = fs.readFileSync(csvPath, 'utf-8');

        // Use Papa Parse for proper CSV handling (multiline, quotes, etc.)
        const parsed = Papa.parse(csvContent, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
        });

        if (!parsed.data || parsed.data.length === 0) {
            return NextResponse.json({ data: [] });
        }

        // Models to exclude (deprecated or no data)
        const EXCLUDED_MODELS = ['mistralai/mistral-medium', '01-ai/yi-34b-chat'];

        // Map to expected format - handle various CSV column naming conventions
        const data = parsed.data.map((row: any) => ({
            timestamp: row.timestamp || row.test_date || row.date || '',
            model: row.model || row.model_id || '',
            case_id: row.case_id || row.prompt_id || row.run_id || '',
            category: row.category || '',
            verdict: row.verdict || '',
            prompt: row.prompt || row.prompt_text || row.text || '',
            response: row.response || row.response_text || '',
            cost: parseFloat(row.cost || row.run_cost) || 0,
            tokens_used: parseInt(row.tokens_used) || parseInt(row.total_tokens) || 0,
            latency_ms: parseInt(row.latency_ms) || 0,
        })).filter((row: any) => row.model && !EXCLUDED_MODELS.includes(row.model)); // Filter out rows without model or excluded models

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Error reading audit data:', error);
        return NextResponse.json({ error: 'Failed to read audit log', data: [] }, { status: 500 });
    }
}
