const { put } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');

async function uploadToBlob() {
    const fileName = 'audit_log.csv.gz';
    const filePath = path.join(__dirname, `../public/${fileName}`);

    if (!fs.existsSync(filePath)) {
        console.error(`❌ ${fileName} not found. Ensure it exists in public/ folder.`);
        process.exit(1);
    }

    console.log(`📤 Uploading ${fileName} to Vercel Blob...`);

    try {
        const fileContent = fs.readFileSync(filePath);
        // Upload to 'data/audit_log.csv.gz'
        const { url } = await put(`data/${fileName}`, fileContent, { access: 'public' });

        console.log('✅ Upload successful!');
        console.log(`🔗 Blob URL: ${url}`);

        // Write URL to a local file for the frontend to use (optional but helpful)
        fs.writeFileSync(path.join(__dirname, '../.blob-url'), url);

    } catch (error) {
        console.error('❌ Upload failed:', error);
        process.exit(1);
    }
}

uploadToBlob();
