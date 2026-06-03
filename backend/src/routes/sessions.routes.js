import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ApiError } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { wifiGuard } from '../middleware/wifiGuard.js';
import { ROLES } from '../config/constants.js';
import { MSG } from '../utils/messages.fr.js';
import * as scheduleService from '../services/scheduleService.js';
import * as qrService from '../services/qrService.js';
import * as attendanceService from '../services/attendanceService.js';
import { Session } from '../models/Session.js';

const router = Router();
router.use(authenticate);

// Liste des sessions. Un formateur ne voit que les siennes.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = { groupe: req.query.groupe, status: req.query.status, from: req.query.from, to: req.query.to };
    if (req.user.role === ROLES.FORMATEUR) {
      filter.formateur = req.user._id;
    } else if (req.user.role === ROLES.STAGIAIRE) {
      // Un stagiaire ne voit que l'emploi du temps de son groupe.
      if (!req.user.groupe) return res.json([]);
      filter.groupe = req.user.groupe;
    } else if (req.query.formateur) {
      filter.formateur = req.query.formateur;
    }
    res.json(await scheduleService.listSessions(filter));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const session = await Session.findById(req.params.id)
      .populate('formateur', 'nom prenom')
      .populate('groupe', 'nom code')
      .populate('salle', 'nom code')
      .populate('module', 'nom code');
    if (!session) throw new ApiError(404, MSG.SESSION_INTROUVABLE);
    res.json(session);
  })
);

// Modification validée d'une session (admin). Refuse tout conflit et propose des créneaux libres.
const patchSessionSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  salle: z.string().optional(),
  formateur: z.string().optional(),
  groupe: z.string().optional(),
  module: z.string().optional(),
});

router.patch(
  '/:id',
  authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const patch = patchSessionSchema.parse(req.body);
    res.json(await scheduleService.modifierSession(req.params.id, patch));
  })
);

// Suggestions de créneaux libres pour une session (admin).
router.get(
  '/:id/suggestions',
  authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const session = await Session.findById(req.params.id);
    if (!session) throw new ApiError(404, MSG.SESSION_INTROUVABLE);
    const suggestions = await scheduleService.suggererCreneaux(
      { start: session.start, groupe: session.groupe, formateur: session.formateur },
      { excludeId: session._id }
    );
    res.json(suggestions);
  })
);

// Active une session (admin ou le formateur concerné).
router.post(
  '/:id/activate',
  authorize(ROLES.ADMIN, ROLES.FORMATEUR),
  asyncHandler(async (req, res) => {
    if (req.user.role === ROLES.FORMATEUR) {
      const s = await Session.findById(req.params.id);
      if (!s) throw new ApiError(404, MSG.SESSION_INTROUVABLE);
      if (String(s.formateur) !== String(req.user._id)) throw new ApiError(403, MSG.ACCES_REFUSE);
      // Le formateur ne peut activer la session que pendant son créneau planifié.
      const now = new Date();
      if (now < s.start || now > s.end) throw new ApiError(409, MSG.SESSION_HORS_CRENEAU);
    }
    res.json(await qrService.activateSession(req.params.id));
  })
);

// QR dynamique (admin ou formateur concerné).
router.get(
  '/:id/qr',
  authorize(ROLES.ADMIN, ROLES.FORMATEUR),
  asyncHandler(async (req, res) => {
    res.json(await qrService.generateQr(req.params.id));
  })
);

// Scan du QR par un stagiaire — protégé par le contrôle WiFi (CIDR du centre).
router.post(
  '/:id/scan',
  authorize(ROLES.STAGIAIRE),
  wifiGuard,
  asyncHandler(async (req, res) => {
    const { token } = z.object({ token: z.string().min(1) }).parse(req.body);
    const result = await attendanceService.scan({
      sessionId: req.params.id,
      token,
      stagiaire: req.user,
      scanIp: req.scanIp,
      deviceId: req.get('X-Device-Id'),
    });
    res.json({ message: MSG.PRESENCE_ENREGISTREE, status: result.status });
  })
);

// Feuille de présence d'une session (admin / formateur concerné).
router.get(
  '/:id/attendance',
  authorize(ROLES.ADMIN, ROLES.FORMATEUR),
  asyncHandler(async (req, res) => {
    res.json(await attendanceService.listSessionAttendance(req.params.id, req.user));
  })
);

// Feuille d'appel : tous les stagiaires du groupe + leur présence (admin / formateur concerné).
router.get(
  '/:id/roster',
  authorize(ROLES.ADMIN, ROLES.FORMATEUR),
  asyncHandler(async (req, res) => {
    res.json(await attendanceService.getSessionRoster(req.params.id, req.user));
  })
);

// Marquage manuel d'une présence — repli si le QR code ne fonctionne pas.
const markSchema = z.object({
  stagiaire: z.string().min(1),
  status: z.enum(['present', 'retard', 'absent_injustifie', 'absent_justifie']),
});

router.put(
  '/:id/attendance',
  authorize(ROLES.ADMIN, ROLES.FORMATEUR),
  asyncHandler(async (req, res) => {
    const { stagiaire, status } = markSchema.parse(req.body);
    const attendance = await attendanceService.markManual({
      sessionId: req.params.id,
      stagiaireId: stagiaire,
      status,
      marqueur: req.user,
    });
    res.json({ message: MSG.PRESENCE_MISE_A_JOUR, attendance });
  })
);

export default router;
