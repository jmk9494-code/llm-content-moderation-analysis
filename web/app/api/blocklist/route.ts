import { createClient } from '@vercel/edge-config';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
    try {
        if (!process.env.EDGE_CONFIG) {
            console.warn('EDGE_CONFIG not set, using default blocklist');
            return NextResponse.json(['yi-34b', 'mistral-medium', 'gpt-audio']);
        }

        const config = createClient(process.env.EDGE_CONFIG);
        const blocklist = await config.get('blocklist');

        // Default fallback if not set in Edge Config yet
        const defaultBlocklist = ['yi-34b', 'mistral-medium', 'gpt-audio'];

        return NextResponse.json(blocklist || defaultBlocklist);
    } catch (error) {
        console.error('Error fetching from Edge Config:', error);
        // Fail safe to default
        return NextResponse.json(['yi-34b', 'mistral-medium', 'gpt-audio']);
    }
}
