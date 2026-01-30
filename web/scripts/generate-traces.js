const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const Papa = require('papaparse');

const INPUT_PATH = path.join(__dirname, '../public/audit_log.csv.gz');
const OUTPUT_PATH = path.join(__dirname, '../public/assets/traces.json');
const OUTPUT_DIR = path.dirname(OUTPUT_PATH);

async function generateTraces() {
    console.log('🔄 Generating traces.json from audit_log.csv.gz...');

    if (!fs.existsSync(INPUT_PATH)) {
        console.error(`❌ Error: Input file not found at ${INPUT_PATH}`);
        process.exit(1);
    }

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    try {
        const fileBuffer = fs.readFileSync(INPUT_PATH);
        const decompressed = zlib.gunzipSync(fileBuffer);
        const csvString = decompressed.toString('utf-8');

        Papa.parse(csvString, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const jsonData = JSON.stringify(results.data);
                fs.writeFileSync(OUTPUT_PATH, jsonData);
                console.log(`✅ Successfully generated ${OUTPUT_PATH} (${(jsonData.length / 1024 / 1024).toFixed(2)} MB)`);
            },
            error: (err) => {
                console.error("❌ Error parsing CSV:", err);
                process.exit(1);
            }
        });
    } catch (error) {
        console.error("❌ Error generating traces.json:", error);
        process.exit(1);
    }
}

generateTraces();
