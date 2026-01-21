import { NextResponse } from 'next/server';
import path from 'path';
import Database from 'better-sqlite3';

const DB_PATH = path.join(process.cwd(), '../audit.db'); // Adjust path as needed (root is one up from web?)
// Actually process.cwd() in Next.js is usually project root or web root? 
// If project root is "llm-content-.../web", then DB is in "llm-content-..." which is ".."
// Let's assume process.cwd() is web root.

export async function GET() {
    try {
        const db = new Database(DB_PATH, { verbose: console.log, readonly: true });

        // We need to join with audit_results to get human_verdict?
        // Or did we migrate grades INTO audit_results?
        // Yes, src/migrate_csv_to_sql.py merged grades into audit_results (human_verdict column).

        // Return rows where human_verdict IS NOT NULL
        const stmt = db.prepare(`
            SELECT 
                r.run_id as case_id,
                r.human_verdict,
                r.notes,
                r.verdict as original_verdict
            FROM audit_results r
            WHERE r.human_verdict IS NOT NULL
        `);

        const rows = stmt.all();
        db.close();

        return NextResponse.json({ data: rows });
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: 'Failed to read grades' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { case_id, human_verdict, notes } = body;

        if (!case_id || !human_verdict) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const db = new Database(DB_PATH);

        // Update the existing audit record
        const stmt = db.prepare(`
            UPDATE audit_results 
            SET human_verdict = ?, notes = ?
            WHERE run_id = ?
        `);

        const info = stmt.run(human_verdict, notes || '', case_id);
        db.close();

        if (info.changes === 0) {
            return NextResponse.json({ error: 'Case ID not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: 'Failed to save grade' }, { status: 500 });
    }
}
