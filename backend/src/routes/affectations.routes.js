import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ApiError } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';
import { MSG } from '../utils/messages.fr.js';
import { Affectation } from '../models/Affectation.js';

const router = Router();
router.use(authenticate);

const POPULATE = [
  { path: 'groupe', select: 'nom code' },
  { path: 'module', select: 'nom code' },
  { path: 'formateur', select: 'nom prenom email heuresHebdo' },
];

const affectationSchema = z.object({
  groupe: z.string().min(1),
  module: z.string().min(1),
  formateur: z.string().min(1),
  heuresParSemaine: z.number().positive().optional(),
});

// Liste (tous les rôles authentifiés).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      groupe: z.string().min(1).optional(),
      module: z.string().min(1).optional(),
      formateur: z.string().min(1).optional(),
    });
    const { groupe, module, formateur } = querySchema.parse(req.query);
    const filter = {};
    if (groupe && groupe !== 'all') filter.groupe = groupe;
    if (module && module !== 'all') filter.module = module;
    if (formateur && formateur !== 'all') filter.formateur = formateur;

    res.json(await Affectation.find(filter).populate(POPULATE).sort({ createdAt: -1 }));
  })
);

// Création (admin).
router.post(
  '/',
  authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const doc = await Affectation.create(affectationSchema.parse(req.body));
    res.status(201).json(await doc.populate(POPULATE));
  })
);

// Modification (admin).
router.patch(
  '/:id',
  authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const doc = await Affectation.findByIdAndUpdate(
      req.params.id,
      affectationSchema.partial().parse(req.body),
      { new: true, runValidators: true }
    ).populate(POPULATE);
    if (!doc) throw new ApiError(404, MSG.AFFECTATION_INTROUVABLE);
    res.json(doc);
  })
);

// Suppression (admin).
router.delete(
  '/:id',
  authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const doc = await Affectation.findByIdAndDelete(req.params.id);
    if (!doc) throw new ApiError(404, MSG.AFFECTATION_INTROUVABLE);
    res.json({ ok: true });
  })
);

export default router;
