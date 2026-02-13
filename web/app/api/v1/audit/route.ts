import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Created via scripts/upload-to-blob.js
const BLOB_URL = 'https://oeqbf51ent3zxva1.public.blob.vercel-storage.com/audit_data.json';

export async function GET() {
    try {
        const response = await fetch(BLOB_URL, {
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch blob: ${response.statusText}`);
        }

        const data = await response.json();
        return NextResponse.json({ data });
    } catch (error) {
        console.error('Edge API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch audit data' }, { status: 500 });
    }
}
