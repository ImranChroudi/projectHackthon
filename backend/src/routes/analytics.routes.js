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

export default router;
