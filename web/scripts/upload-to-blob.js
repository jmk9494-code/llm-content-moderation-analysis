
const Database = require('better-sqlite3');
const { put } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');

// Ensure BLOB_READ_WRITE_TOKEN is set in environment
if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('Error: BLOB_READ_WRITE_TOKEN environment variable is required.');
    process.exit(1);
}

const Papa = require('papaparse');

async function getData() {
    const DB_PATH = path.join(__dirname, '../audit.db');
    const CSV_PATH = path.join(__dirname, '../public/audit_log.csv');

    if (fs.existsSync(DB_PATH)) {
        console.log('Reading from local database...');
        const db = new Database(DB_PATH, { readonly: true });
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
                r.prompt_tokens + r.completion_tokens as tokens_used 
            FROM audit_results r
            LEFT JOIN prompts p ON r.prompt_id = p.id
            ORDER BY r.timestamp DESC
        `);
        const rows = stmt.all();
        db.close();
        return rows;
    } else if (fs.existsSync(CSV_PATH)) {
        console.log('Database not found. Reading from CSV...');
        const csvFile = fs.readFileSync(CSV_PATH, 'utf8');
        return new Promise((resolve, reject) => {
            Papa.parse(csvFile, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    // Normalize fields to match API expectation
                    const data = results.data.map(row => ({
                        timestamp: row.timestamp || row.test_date || row.date,
                        model: row.model || row.model_id,
                        case_id: row.case_id || row.prompt_id || row.run_id,
                        category: row.category,
                        verdict: row.verdict,
                        prompt: row.prompt || row.prompt_text || row.text,
                        response: row.response || row.response_text,
                        cost: parseFloat(row.cost || row.run_cost || 0),
                        tokens_used: parseInt(row.tokens_used || row.total_tokens || 0)
                    }));
                    resolve(data);
                },
                error: (err) => reject(err)
            });
        });
    } else {
        throw new Error(`No data source found. Expected ${DB_PATH} or ${CSV_PATH}`);
    }
}

async function start() {
    try {
        const rows = await getData();
        console.log(`Extracted ${rows.length} rows.`);
        await upload(rows);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

async function upload(data) {
    console.log('Uploading to Vercel Blob...');
    try {
        const { url } = await put('audit_data.json', JSON.stringify(data), {
            access: 'public',
            addRandomSuffix: false // Overwrite existing file
        });
        console.log(`Successfully uploaded to: ${url}`);
    } catch (error) {
        console.error('Upload failed:', error);
        process.exit(1);
    }
}

start();
// Remove old upload call 
// upload(); 
