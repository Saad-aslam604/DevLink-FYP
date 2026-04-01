const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists at project root (consistent with runtime static mount)
const uploadsDir = path.join(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
} catch (e) { console.warn('Failed to create uploads dir', e && e.message ? e.message : e) }

// Allowed mime types and extensions (safe whitelist)
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  // common documents
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'text/csv',
  // code files (as text)
  'text/javascript', 'application/javascript', 'application/json', 'text/x-python', 'text/x-java-source',
]);

// Block dangerous file extensions explicitly
const DISALLOWED_EXT = new Set(['.exe', '.sh', '.bat', '.cmd', '.js', '.msi']);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    try {
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
    } catch (e) {
      return cb(new Error('Failed to create upload directory'))
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, '')
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2,9)}${ext}`
    cb(null, uniqueName);
  }
});

function fileFilter(req, file, cb) {
  try {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (DISALLOWED_EXT.has(ext)) return cb(new Error('File type not allowed'), false);
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    // Allow some files by extension if mime is missing
    const allowByExt = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.txt', '.csv', '.json', '.py', '.java'];
    if (allowByExt.includes(ext)) return cb(null, true);
    return cb(new Error('Unsupported file type'), false);
  } catch (e) {
    return cb(new Error('File validation error'), false);
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter,
});

module.exports = {
  upload,
  uploadsDir,
};
