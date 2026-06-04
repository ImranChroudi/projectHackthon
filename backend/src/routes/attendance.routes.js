import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';
import { Attendance } from '../models/Attendance.js';
import * as attendanceService from '../services/attendanceService.js';

const router = Router();
router.use(authenticate);

// Historique des présences (formateur : les siennes ; admin : toutes).
router.get(
  '/history',
  authorize(ROLES.FORMATEUR, ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const { groupe, module, formateur, stagiaire, status, from, to } = req.query;
    res.json(
      await attendanceService.listHistory(req.user, {
        groupe,
        module,
        formateur,
        stagiaire,
        status,
        from,
        to,
      })
    );
  })
);

// Historique de présence du stagiaire connecté.
router.get(
  '/me',
  authorize(ROLES.STAGIAIRE),
  asyncHandler(async (req, res) => {
    const records = await Attendance.find({ stagiaire: req.user._id })
      .sort({ sessionStart: -1, createdAt: -1 })
      .populate('module', 'nom code')
      .populate({ path: 'session', select: 'start end', populate: { path: 'salle', select: 'nom code' } })
      .populate('justification', 'statut');
    res.json(records);
  })
);

export default router;
