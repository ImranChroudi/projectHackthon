import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';
import * as analytics from '../services/analyticsService.js';

const router = Router();
router.use(authenticate);

// Statistiques globales : réservées à l'admin.
router.get(
  '/modules',
  authorize(ROLES.ADMIN),
  asyncHandler(async (_req, res) => res.json(await analytics.modulesParAbsence()))
);

router.get(
  '/timeslots',
  authorize(ROLES.ADMIN),
  asyncHandler(async (_req, res) => res.json(await analytics.creneauxParAbsence()))
);

router.get(
  '/groupes',
  authorize(ROLES.ADMIN),
  asyncHandler(async (_req, res) => res.json(await analytics.groupesParAbsence()))
);

router.get(
  '/stagiaires',
  authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) =>
    res.json(await analytics.stagiairesParAbsence({}, Number(req.query.limit) || 20))
  )
);

// Tableau de bord scopé au formateur connecté.
router.get(
  '/formateur/me',
  authorize(ROLES.FORMATEUR, ROLES.ADMIN),
  asyncHandler(async (req, res) => res.json(await analytics.dashboardFormateur(req.user)))
);

// Liste détaillée des absences dans le périmètre du formateur connecté.
router.get(
  '/formateur/absences',
  authorize(ROLES.FORMATEUR, ROLES.ADMIN),
  asyncHandler(async (req, res) => res.json(await analytics.absencesFormateur(req.user)))
);

// Absences d'aujourd'hui
router.get(
  '/today/stagiaires-absents',
  authorize(ROLES.ADMIN),
  asyncHandler(async (_req, res) => {
    const count = await analytics.stagiairesAbsentsAujourdhui();
    res.json({ absents: count });
  })
);

router.get(
  '/today/groupe-max-absences',
  authorize(ROLES.ADMIN),
  asyncHandler(async (_req, res) => res.json(await analytics.groupePlusAbsencesAujourdhui()))
);

export default router;
