import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const reportPath = path.join(process.cwd(), 'public', 'latest_report.md');

        if (!fs.existsSync(reportPath)) {
            return NextResponse.json({ content: '', error: 'Report not found' });
        }

        const content = fs.readFileSync(reportPath, 'utf-8');
        return NextResponse.json({ content });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to read report', content: '' }, { status: 500 });
    }
}
