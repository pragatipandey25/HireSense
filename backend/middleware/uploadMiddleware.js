import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// On Vercel / serverless environments, the root filesystem is read-only. Use os.tmpdir().
const uploadsDir = process.env.VERCEL
  ? path.join(os.tmpdir(), 'hiresense-uploads')
  : path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.warn('Uploads directory initialization notice:', err.message);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `resume-${uniqueSuffix}${ext}`);
  }
});

/**
 * Magic bytes for file validation:
 * PDF: %PDF (25 50 44 46)
 * DOCX: PK (50 4B 03 04) — standard ZIP container
 */
const MAGIC_BYTES = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  docx: [0x50, 0x4B, 0x03, 0x04], // PK\x03\x04
};

export const validateMagicBytes = (buffer) => {
  if (!buffer || buffer.length < 4) return null;

  const header = Array.from(buffer.slice(0, 4));

  // Check PDF
  if (header.every((byte, i) => byte === MAGIC_BYTES.pdf[i])) {
    return 'pdf';
  }

  // Check DOCX (standard ZIP header)
  if (header.every((byte, i) => byte === MAGIC_BYTES.docx[i])) {
    return 'docx';
  }

  // Check loose ZIP header (DOCX can occasionally use PK\x05\x06 or empty container)
  if (header[0] === 0x50 && header[1] === 0x4B) {
    return 'docx';
  }

  return null;
};

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.pdf' && ext !== '.docx') {
    return cb(new Error('Invalid file extension. Only .pdf and .docx documents are supported.'), false);
  }

  if (!allowedMimeTypes.includes(file.mimetype) && file.mimetype !== 'application/octet-stream') {
    return cb(new Error('Only PDF and DOCX files are allowed.'), false);
  }

  cb(null, true);
};

// Post-upload magic byte validation (supports both single req.file and multi-file req.files)
const validateFileIntegrity = (req, res, next) => {
  const filesToCheck = [];

  if (req.file) {
    filesToCheck.push(req.file);
  } else if (Array.isArray(req.files)) {
    filesToCheck.push(...req.files);
  } else if (req.files && typeof req.files === 'object') {
    Object.values(req.files).forEach((f) => {
      if (Array.isArray(f)) filesToCheck.push(...f);
      else filesToCheck.push(f);
    });
  }

  if (filesToCheck.length === 0) {
    return next();
  }

  for (const file of filesToCheck) {
    const filePath = file.path;
    try {
      if (!fs.existsSync(filePath)) {
        continue;
      }

      const buffer = fs.readFileSync(filePath);
      const detectedType = validateMagicBytes(buffer);

      if (!detectedType) {
        // Clean up invalid uploaded file
        try { fs.unlinkSync(filePath); } catch {}
        return res.status(400).json({
          success: false,
          message: `Invalid file format for "${file.originalname}". The file does not appear to be a valid PDF or DOCX document.`,
        });
      }

      const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
      if (detectedType !== ext && !(ext === 'docx' && detectedType === 'docx')) {
        try { fs.unlinkSync(filePath); } catch {}
        return res.status(400).json({
          success: false,
          message: `File type mismatch for "${file.originalname}": detected ${detectedType.toUpperCase()} but extension is .${ext}.`,
        });
      }
    } catch (error) {
      try { fs.unlinkSync(filePath); } catch {}
      return res.status(500).json({
        success: false,
        message: `Failed to validate file integrity for ${file.originalname}.`,
      });
    }
  }

  next();
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
  },
});

export { upload, validateFileIntegrity };
export default upload;
