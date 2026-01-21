import { NextResponse } from 'next/server';
import path from 'path';
import Database from 'better-sqlite3';

const DB_PATH = path.join(process.cwd(), '../audit.db');

export async function GET() {
    try {
        const db = new Database(DB_PATH, { readonly: true });

        // Select all audit results for CSV export
        const stmt = db.prepare(`
            SELECT 
                r.timestamp,
                r.model_id as model,
                r.run_id as case_id,
                p.category,
                r.verdict,
                p.text as prompt,
                r.response_text as response,
                r.cost,
                r.prompt_tokens,
                r.completion_tokens,
                r.human_verdict,
                r.notes
            FROM audit_results r
            LEFT JOIN prompts p ON r.prompt_id = p.id
            ORDER BY r.timestamp DESC
        `);

        const rows = stmt.all() as Record<string, unknown>[];
        db.close();

        if (!rows.length) {
            return new NextResponse('No data available', { status: 404 });
        }

        // Convert to CSV
        const headers = Object.keys(rows[0]);
        const csvLines = [
            headers.join(','),
            ...rows.map(row =>
                headers.map(h => {
                    const val = row[h];
                    if (val === null || val === undefined) return '';
                    // Escape quotes and wrap in quotes if contains comma
                    const str = String(val).replace(/"/g, '""');
                    return str.includes(',') || str.includes('\n') ? `"${str}"` : str;
                }).join(',')
            )
        ];
        const csv = csvLines.join('\n');

        // Return as downloadable CSV
        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="audit_export_${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });

    } catch (error) {
        console.error('Export Error:', error);
        return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
    }
}
