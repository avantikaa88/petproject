const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Make sure the uploads folder exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Only allow real image types to be written to disk
const ALLOWED_MIME_TYPES = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
};

/**
 * Accepts a base64 data URL (e.g. "data:image/png;base64,iVBORw0KGgo...")
 * and writes it to /server/uploads. Returns the public path to store in
 * the database, e.g. "/uploads/1710000000000-a1b2c3.png".
 *
 * Returns null if `dataUrl` isn't a valid/allowed image data URL.
 */
function saveBase64Image(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') return null;

    const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) return null;

    const mimeType = match[1].toLowerCase();
    const base64Data = match[2];

    const extension = ALLOWED_MIME_TYPES[mimeType];
    if (!extension) return null;

    const buffer = Buffer.from(base64Data, 'base64');

    // Guard against absurdly large uploads (5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
        throw new Error('Image is too large. Please use an image under 5MB.');
    }

    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);

    fs.writeFileSync(filePath, buffer);

    return `/uploads/${uniqueName}`;
}

/**
 * Deletes a previously-uploaded product image given its stored public path
 * (e.g. "/uploads/xyz.png"). Safe no-op for external URLs or missing files.
 */
function deleteUploadedImage(imagePath) {
    if (!imagePath || typeof imagePath !== 'string') return;
    if (!imagePath.startsWith('/uploads/')) return; // don't touch external URLs

    const fileName = path.basename(imagePath);
    const filePath = path.join(UPLOAD_DIR, fileName);

    fs.unlink(filePath, (err) => {
        if (err && err.code !== 'ENOENT') {
            console.error('Failed to delete old product image:', err);
        }
    });
}

module.exports = { saveBase64Image, deleteUploadedImage, UPLOAD_DIR };