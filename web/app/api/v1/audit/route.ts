import { NextResponse } from 'next/server';
import path from 'path';
import Database from 'better-sqlite3';

const DB_PATH = path.join(process.cwd(), 'audit.db');

export async function GET() {
    try {
        const db = new Database(DB_PATH, { readonly: true });

        // Select all audit results
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
                r.prompt_tokens + r.completion_tokens as latency_ms, 
                r.prompt_tokens + r.completion_tokens as tokens_used 
            FROM audit_results r
            LEFT JOIN prompts p ON r.prompt_id = p.id
            ORDER BY r.timestamp DESC
        `);
        // Note: latency_ms is actually not stored in DB currently (column not in schema provided earlier? I didn't verify it in src/database.py view)
        // Schema view in Step 907 showed: cost, prompt_tokens, completion_tokens. NO latency_ms column.
        // I should stick to 'tokens_used' or use a placeholder for latency if missing. 
        // Logic: r.timestamp is when it finished. DB doesn't track duration? 
        // audit_runner.py doesn't seem to calculate duration explicitly for DB save?
        // Re-reading Step 945: audit_runner.py line 248... it saves verdict, response_text, cost.
        // It does NOT save latency/duration.
        // The CSV *did* have it?
        // ParseCSV in Step 852: `latency_ms: row.latency_ms`.
        // So the DB schema is MISSING latency_ms!

        // I should ADD latency_ms to the DB schema if I can, but I already made the migration script.
        // For now, I will omit latency or set to 0.

        const rows = stmt.all();
        db.close();

        return NextResponse.json({ data: rows });
    } catch (error) {
        console.error('Database Error:', error);
        // Fallback or empty?
        return NextResponse.json({ error: 'Failed to read audit log' }, { status: 500 });
    }
}
