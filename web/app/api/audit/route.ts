import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        // Read from CSV file in public folder
        const csvPath = path.join(process.cwd(), 'public', 'audit_log.csv');

        if (!fs.existsSync(csvPath)) {
            return NextResponse.json({ data: [], error: 'No audit data found' });
        }

        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.trim().split('\n');

        if (lines.length < 2) {
            return NextResponse.json({ data: [] });
        }

        // Parse header
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        // Parse rows
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length !== headers.length) continue;

            const row: Record<string, any> = {};
            headers.forEach((header, idx) => {
                row[header] = values[idx];
            });

            // Map to expected format
            data.push({
                timestamp: row.timestamp || row.date || '',
                model: row.model || row.model_id || '',
                case_id: row.case_id || row.run_id || '',
                category: row.category || '',
                verdict: row.verdict || '',
                prompt: row.prompt || row.text || '',
                response: row.response || row.response_text || '',
                cost: parseFloat(row.cost) || 0,
                tokens_used: parseInt(row.tokens_used) || parseInt(row.prompt_tokens) + parseInt(row.completion_tokens) || 0,
                latency_ms: parseInt(row.latency_ms) || 0,
            });
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Error reading audit data:', error);
        return NextResponse.json({ error: 'Failed to read audit log', data: [] }, { status: 500 });
    }
}

// Helper to parse CSV lines handling quoted fields
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());

    return result;
}
