import dotenv from 'dotenv';

dotenv.config();

const num = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const list = (value, fallback = []) =>
  value
    ? value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : fallback;

export const env = {
  port: num(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/attendance',

  // URL publique du frontend — encodée dans le QR pour qu'un appareil photo l'ouvre.
  appUrl: process.env.APP_URL || 'http://localhost:5173',

  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  qrSecret: process.env.QR_SECRET || 'dev-qr-secret',

  qrRotationSeconds: num(process.env.QR_ROTATION_SECONDS, 12),
  scanWindowMinutes: num(process.env.SESSION_SCAN_WINDOW_MINUTES, 15),
  retardGraceMinutes: num(process.env.RETARD_GRACE_MINUTES, 5),
  seuilProche: num(process.env.SEUIL_PROCHE, 8),
  limiteStricte: num(process.env.LIMITE_STRICTE, 10),

  campusCidrs: list(process.env.CAMPUS_CIDRS, [
    '127.0.0.1/32',
    '::1/128',
    '192.168.0.0/16',
    '10.0.0.0/8',
  ]),

  autoAbsenceCron: process.env.AUTO_ABSENCE_CRON || '* * * * *',

  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxUploadMb: num(process.env.MAX_UPLOAD_MB, 10),

  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@centre.ma',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin123!',
};
