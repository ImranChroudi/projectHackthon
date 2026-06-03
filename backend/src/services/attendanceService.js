import { env } from '../config/env.js';
import { ATTENDANCE_STATUS, ROLES } from '../config/constants.js';
import { ApiError } from '../utils/asyncHandler.js';
import { MSG } from '../utils/messages.fr.js';
import { Session } from '../models/Session.js';
import { Groupe } from '../models/Groupe.js';
import { User } from '../models/User.js';
import { Attendance } from '../models/Attendance.js';
import { evaluerAlertesAbsence } from './alertService.js';
import { verifyScanToken } from './qrService.js';

// Enregistre la présence d'un stagiaire suite au scan du QR.
// Le contrôle WiFi (CIDR) est déjà appliqué par le middleware wifiGuard en amont.
export async function scan({ sessionId, token, stagiaire, scanIp, deviceId, now = new Date() }) {
  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, MSG.SESSION_INTROUVABLE);

  // Le stagiaire doit appartenir au groupe de la session.
  if (!stagiaire.groupe || String(stagiaire.groupe) !== String(session.groupe)) {
    throw new ApiError(403, MSG.PAS_DANS_GROUPE);
  }

  // Vérifie le jeton tournant + la fenêtre de 15 minutes.
  verifyScanToken(session, token, now);

  // Déjà présent ? (l'index unique protège aussi côté base)
  const existant = await Attendance.findOne({ session: session._id, stagiaire: stagiaire._id });
  if (existant) throw new ApiError(409, MSG.DEJA_PRESENT);

  // Présent, ou en retard si la période de grâce est dépassée.
  const limiteRetard = new Date(session.start.getTime() + env.retardGraceMinutes * 60 * 1000);
  const status = now > limiteRetard ? ATTENDANCE_STATUS.RETARD : ATTENDANCE_STATUS.PRESENT;

  let attendance;
  try {
    attendance = await Attendance.create({
      session: session._id,
      stagiaire: stagiaire._id,
      groupe: session.groupe,
      module: session.module,
      formateur: session.formateur,
      sessionStart: session.start,
      status,
      scannedAt: now,
      scanIp,
    });
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, MSG.DEJA_PRESENT);
    throw err;
  }

  // Anti-fraude : verrouille la déconnexion ET la connexion vers un autre compte
  // pendant 15 minutes (à compter du scan) sur l'appareil utilisé. L'étudiant ne
  // peut donc pas se déconnecter / se reconnecter sur le compte d'un ami pour
  // scanner à sa place tant que la fenêtre est ouverte.
  stagiaire.scanLockUntil = new Date(now.getTime() + env.scanWindowMinutes * 60 * 1000);
  stagiaire.scanLockDevice = deviceId || null;
  await stagiaire.save();

  return { attendance, status };
}

// Liste les présences d'une session (réservé formateur/admin).
export async function listSessionAttendance(sessionId, requester) {
  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, MSG.SESSION_INTROUVABLE);

  // Un formateur ne voit que ses propres sessions.
  if (requester.role === ROLES.FORMATEUR && String(session.formateur) !== String(requester._id)) {
    throw new ApiError(403, MSG.ACCES_REFUSE);
  }

  return Attendance.find({ session: sessionId }).populate('stagiaire', 'nom prenom email');
}

// Vérifie que le demandeur (formateur concerné ou admin) peut gérer la session.
async function chargerSessionGeree(sessionId, requester) {
  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, MSG.SESSION_INTROUVABLE);
  if (requester.role === ROLES.FORMATEUR && String(session.formateur) !== String(requester._id)) {
    throw new ApiError(403, MSG.ACCES_REFUSE);
  }
  return session;
}

// Feuille d'appel : tous les stagiaires du groupe + leur présence éventuelle.
// Sert au marquage manuel quand le QR ne fonctionne pas.
export async function getSessionRoster(sessionId, requester) {
  const session = await chargerSessionGeree(sessionId, requester);

  const groupe = await Groupe.findById(session.groupe).populate('stagiaires', 'nom prenom email');
  const stagiaires = groupe ? groupe.stagiaires : [];

  const records = await Attendance.find({ session: sessionId });
  const parStagiaire = new Map(records.map((a) => [String(a.stagiaire), a]));

  return stagiaires.map((s) => {
    const a = parStagiaire.get(String(s._id));
    return {
      stagiaire: { _id: s._id, nom: s.nom, prenom: s.prenom, email: s.email },
      status: a ? a.status : null,
      scannedAt: a ? a.scannedAt : null,
      manuel: a ? Boolean(a.markedBy) : false,
    };
  });
}

// Marquage manuel d'une présence par un formateur/admin (repli si le QR échoue).
// Crée ou met à jour la fiche et maintient le compteur dénormalisé d'absences.
export async function markManual({ sessionId, stagiaireId, status, marqueur }) {
  const session = await chargerSessionGeree(sessionId, marqueur);

  const groupe = await Groupe.findById(session.groupe).select('stagiaires');
  const dansGroupe = groupe?.stagiaires.some((id) => String(id) === String(stagiaireId));
  if (!dansGroupe) throw new ApiError(403, MSG.PAS_DANS_GROUPE);

  const existant = await Attendance.findOne({ session: sessionId, stagiaire: stagiaireId });
  const ancienStatut = existant ? existant.status : null;

  let attendance;
  if (existant) {
    existant.status = status;
    existant.markedBy = marqueur._id;
    attendance = await existant.save();
  } else {
    attendance = await Attendance.create({
      session: session._id,
      stagiaire: stagiaireId,
      groupe: session.groupe,
      module: session.module,
      formateur: session.formateur,
      sessionStart: session.start,
      status,
      markedBy: marqueur._id,
    });
  }

  // Maintient le compteur d'absences injustifiées (utilisé par les alertes).
  const ABS = ATTENDANCE_STATUS.ABSENT_INJUSTIFIE;
  const delta = (status === ABS ? 1 : 0) - (ancienStatut === ABS ? 1 : 0);
  if (delta !== 0) {
    const stagiaire = await User.findByIdAndUpdate(
      stagiaireId,
      { $inc: { absenceCount: delta } },
      { new: true }
    );
    if (delta > 0 && stagiaire) await evaluerAlertesAbsence(stagiaire);
  }

  return attendance;
}
