import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadJustificatifs } from '../middleware/upload.js';
import { ROLES, JUSTIFICATION_STATUS } from '../config/constants.js';
import { MSG } from '../utils/messages.fr.js';
import * as justificationService from '../services/justificationService.js';

const router = Router();
router.use(authenticate);

// Stagiaire : soumet une justification (texte + documents).
router.post(
  '/',
  authorize(ROLES.STAGIAIRE),
  uploadJustificatifs,
  asyncHandler(async (req, res) => {
    const { attendanceId, texte } = z
      .object({ attendanceId: z.string(), texte: z.string().optional() })
      .parse(req.body);
    const justification = await justificationService.soumettre({
      attendanceId,
      stagiaire: req.user,
      texte,
      documents: req.files,
    });
    res.status(201).json({ message: MSG.JUSTIF_SOUMISE, justification });
  })
);

// Stagiaire : liste ses propres justifications.
router.get(
  '/me',
  authorize(ROLES.STAGIAIRE),
  asyncHandler(async (req, res) => {
    res.json(await justificationService.mesJustifications(req.user._id));
  })
);

// Admin : file d'attente de validation.
router.get(
  '/',
  authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const statut = req.query.statut || JUSTIFICATION_STATUS.EN_ATTENTE;
    res.json(await justificationService.listerQueue(statut));
  })
);

// Admin : approuve / refuse.
router.patch(
  '/:id',
  authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const { decision, motifRefus } = z
      .object({
        decision: z.enum([JUSTIFICATION_STATUS.APPROUVE, JUSTIFICATION_STATUS.REFUSE]),
        motifRefus: z.string().optional(),
      })
      .parse(req.body);
    const justification = await justificationService.traiter({
      justificationId: req.params.id,
      admin: req.user,
      decision,
      motifRefus,
    });
    const message =
      decision === JUSTIFICATION_STATUS.APPROUVE ? MSG.JUSTIF_APPROUVEE : MSG.JUSTIF_REFUSEE;
    res.json({ message, justification });
  })
);

export default router;
