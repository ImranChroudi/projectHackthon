import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES, JOURS } from '../config/constants.js';
import * as scheduleService from '../services/scheduleService.js';

const router = Router();
router.use(authenticate);

const entrySchema = z.object({
  jour: z.enum(JOURS),
  heureDebut: z.string().regex(/^\d{2}:\d{2}$/),
  heureFin: z.string().regex(/^\d{2}:\d{2}$/),
  formateur: z.string(),
  groupe: z.string(),
  salle: z.string(),
  module: z.string(),
});

const templateSchema = z.object({
  nom: z.string().optional(),
  semaineDebut: z.string(),
  entries: z.array(entrySchema).min(1),
});

// Enregistre un emploi du temps (admin).
router.post(
  '/upload',
  authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    res.status(201).json(await scheduleService.saveTemplate(templateSchema.parse(req.body)));
  })
);

// Génère les sessions concrètes à partir d'un modèle (admin).
router.post(
  '/generate-sessions',
  authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const { templateId } = z.object({ templateId: z.string() }).parse(req.body);
    const sessions = await scheduleService.generateSessions(templateId);
    res.status(201).json({ count: sessions.length, sessions });
  })
);

// Génère automatiquement l'emploi du temps de la semaine (admin).
router.post(
  '/auto-generate',
  authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const { semaineDebut } = z
      .object({ semaineDebut: z.string().optional() })
      .parse(req.body || {});
    const result = await scheduleService.autoGenererEmploiDuTemps(semaineDebut);
    res.status(201).json(result);
  })
);

export default router;
