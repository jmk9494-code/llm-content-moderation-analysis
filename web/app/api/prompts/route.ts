import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

export async function GET() {
    try {
        // Read from data/prompts.csv located one level up from web root
        // Assuming process.cwd() is the 'web' directory
        const csvPath = path.join(process.cwd(), '../data/prompts.csv');

        // Fallback: Check if it's in public just in case structure changes
        const publicCsvPath = path.join(process.cwd(), 'public', 'prompts.csv');

        let fileContent = '';
        if (fs.existsSync(csvPath)) {
            fileContent = fs.readFileSync(csvPath, 'utf-8');
        } else if (fs.existsSync(publicCsvPath)) {
            fileContent = fs.readFileSync(publicCsvPath, 'utf-8');
        } else {
            return NextResponse.json({ data: [], error: 'Prompts file not found', path: csvPath });
        }

        // Use Papa Parse
        const parsed = Papa.parse(fileContent, {
            header: false, // promps.csv might not have a header, or it might. Let's check.
            skipEmptyLines: true,
            dynamicTyping: true,
        });

        // Current prompts.csv format: "id","category","text"
        // But let's check the file content first to be sure about headers.

        let data = [];
        // Heuristic: Check if first row looks like a header
        if (parsed.data && parsed.data.length > 0) {
            const firstRow = parsed.data[0] as string[];
            const hasHeader = firstRow[0] === 'Prompt_ID' || firstRow[0] === 'Category';

            // If we parsed with header: false, the first row is data[0]
            // If the file actually HAS headers, we should probably strip them or re-parse with header:true
            // To be safe, let's re-parse with header: true if we suspect headers, 
            // or just map manually.
            // Actually, my previous edits showed it HAS headers like "Prompt_ID,Category,Prompt_Text" usually, 
            // OR sometimes just data.
            // Let's rely on the previous knowledge that it likely HAS headers.
            // Let's re-parse with header: true
            const parsedWithHeader = Papa.parse(fileContent, {
                header: true,
                skipEmptyLines: true,
            });

            if (parsedWithHeader.errors.length === 0 && parsedWithHeader.meta.fields && parsedWithHeader.meta.fields.length >= 2) {
                data = parsedWithHeader.data.map((row: any) => ({
                    id: row['Prompt_ID'] || row['id'] || row[0], // fallback
                    category: row['Category'] || row['category'] || row[1],
                    text: row['Prompt_Text'] || row['prompt'] || row['text'] || row[2]
                }));
            } else {
                // Fallback to no-header mapping
                data = parsed.data.map((row: any) => ({
                    id: row[0],
                    category: row[1],
                    text: row[2]
                }));
            }
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Error reading prompts data:', error);
        return NextResponse.json({ error: 'Failed to read prompts', details: String(error) }, { status: 500 });
    }
}
