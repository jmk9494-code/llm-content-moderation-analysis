import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export async function GET() {
    try {
        // In Vercel (and local dev), the DB should be in the root or accessible via process.cwd()
        let dbPath = path.join(process.cwd(), 'audit.db');

        if (!fs.existsSync(dbPath)) {
            // Fallback for local dev (web directory)
            dbPath = path.join(process.cwd(), '../audit.db');
        }

        if (!fs.existsSync(dbPath)) {
            console.error(`Database not found at ${dbPath}`);
            return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
        }

        const db = new Database(dbPath, { readonly: true });

        // Join tables to reconstruct the flat view the frontend expects
        const stmt = db.prepare(`
      SELECT 
        ar.timestamp,
        m.model_id as model,
        p.prompt_id as case_id,
        p.category,
        ar.verdict,
        p.text as prompt,
        ar.response_text as response,
        ar.cost,
        ar.latency_ms,
        ar.tokens_used
      FROM audit_results ar
      JOIN models m ON ar.model_id = m.id
      JOIN prompts p ON ar.prompt_id = p.id
      ORDER BY ar.timestamp DESC
    `);

        const rows = stmt.all();
        db.close();

        return NextResponse.json({ data: rows });
    } catch (error) {
        console.error('Database query failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
