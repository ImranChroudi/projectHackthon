import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { env } from '../config/env.js';
import { SESSION_STATUS } from '../config/constants.js';
import { ApiError } from '../utils/asyncHandler.js';
import { MSG } from '../utils/messages.fr.js';
import { Session } from '../models/Session.js';

// Compteur de rotation : change toutes les QR_ROTATION_SECONDS secondes.
function rotationCounter(now, startMs) {
  return Math.floor((now.getTime() - startMs) / (env.qrRotationSeconds * 1000));
}

// Jeton signé = HMAC(sessionId | compteur), tronqué. Impossible à deviner sans le secret.
function computeToken(sessionId, counter) {
  return crypto
    .createHmac('sha256', env.qrSecret)
    .update(`${sessionId}:${counter}`)
    .digest('hex')
    .slice(0, 32);
}

// Active une session (rend le QR scannable et fixe la fenêtre de 15 min).
// La fenêtre est ancrée au MOMENT de l'activation, pas à l'heure planifiée :
// un formateur active souvent la session avant l'horaire prévu (emploi du temps
// généré à l'avance) — sinon la fermeture serait calculée des jours plus tard.
export async function activateSession(sessionId, now = new Date()) {
  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, MSG.SESSION_INTROUVABLE);

  session.status = SESSION_STATUS.ACTIVE;
  session.qrTokenExpiresAt = new Date(now.getTime() + env.scanWindowMinutes * 60 * 1000);
  await session.save();
  return session;
}

// Génère le QR courant pour une session active.
export async function generateQr(sessionId, now = new Date()) {
  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, MSG.SESSION_INTROUVABLE);
  if (session.status !== SESSION_STATUS.ACTIVE) throw new ApiError(409, MSG.SESSION_NON_ACTIVE);
  if (session.qrTokenExpiresAt && now > session.qrTokenExpiresAt) {
    throw new ApiError(410, MSG.QR_EXPIRE);
  }

  const counter = rotationCounter(now, session.start.getTime());
  const token = computeToken(sessionId, counter);

  session.qrToken = token;
  session.qrRotatedAt = now;
  await session.save();

  // Le QR encode l'URL de scan (avec session + jeton tournant) : un appareil photo
  // l'ouvre directement, et le scanner intégré sait aussi la lire.
  const scanUrl = `${env.appUrl}/stagiaire/scanner?s=${sessionId.toString()}&t=${encodeURIComponent(token)}`;
  const dataUrl = await QRCode.toDataURL(scanUrl);

  return {
    sessionId: sessionId.toString(),
    token,
    scanUrl,
    dataUrl,
    expiresAt: session.qrTokenExpiresAt,
    rotationSeconds: env.qrRotationSeconds,
  };
}

// Tolérance : nombre de rotations passées encore acceptées (en plus de la courante).
// 2 → un jeton reste valable ~24–36 s, le temps d'une connexion avant scan.
const ROTATION_TOLERANCE = 2;

// Vérifie un jeton scanné : on accepte la rotation courante et les quelques précédentes
// (tolérance pour la latence réseau, une connexion intercalée, un décalage d'horloge).
export function verifyScanToken(session, token, now = new Date()) {
  if (session.qrTokenExpiresAt && now > session.qrTokenExpiresAt) {
    throw new ApiError(410, MSG.QR_EXPIRE);
  }
  const counter = rotationCounter(now, session.start.getTime());
  const id = session._id.toString();
  const valides = [];
  for (let i = 0; i <= ROTATION_TOLERANCE; i += 1) {
    valides.push(computeToken(id, counter - i));
  }
  if (!valides.includes(token)) {
    throw new ApiError(400, MSG.QR_INVALIDE);
  }
  return true;
}
