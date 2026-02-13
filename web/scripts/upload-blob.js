const { put } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');

async function uploadToBlob() {
    const files = ['audit_log.csv.gz', 'audit_log_lite.csv.gz'];
    const blobs = [];

    for (const fileName of files) {
        const filePath = path.join(__dirname, `../public/${fileName}`);

        if (!fs.existsSync(filePath)) {
            console.error(`⚠️ ${fileName} not found. Skipping.`);
            continue;
        }

        console.log(`📤 Uploading ${fileName} to Vercel Blob...`);

        try {
            const fileContent = fs.readFileSync(filePath);
            // Upload to 'data/audit_log.csv.gz' etc.
            const { url } = await put(`data/${fileName}`, fileContent, { access: 'public' });

            console.log(`✅ Upload successful: ${fileName}`);
            console.log(`🔗 URL: ${url}`);
            blobs.push({ name: fileName, url });

            // If it's the full log, save it as the main blob url for reference (legacy compat)
            if (fileName === 'audit_log.csv.gz') {
                fs.writeFileSync(path.join(__dirname, '../.blob-url'), url);
            }

        } catch (error) {
            console.error(`❌ Upload failed for ${fileName}:`, error);
            // Don't exit process immediately, try other files
        }
    }

    if (blobs.length === 0) {
        console.error("❌ No files were uploaded.");
        process.exit(1);
    }
}

uploadToBlob();
