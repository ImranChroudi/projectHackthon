import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/asyncHandler.js';

const uploadRoot = path.resolve(process.cwd(), env.uploadDir);
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

// Types acceptés pour les justificatifs (certificats médicaux, etc.).
const ACCEPTES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

function fileFilter(_req, file, cb) {
  if (ACCEPTES.includes(file.mimetype)) cb(null, true);
  else cb(new ApiError(400, 'Type de fichier non autorisé (PDF, PNG ou JPEG attendus).'));
}

export const uploadJustificatifs = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
}).array('documents', 5);
