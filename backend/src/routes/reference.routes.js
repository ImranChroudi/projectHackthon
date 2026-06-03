import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ApiError } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';
import { MSG } from '../utils/messages.fr.js';
import { Groupe } from '../models/Groupe.js';
import { Salle } from '../models/Salle.js';
import { Module } from '../models/Module.js';

// Fabrique un routeur CRUD simple pour une ressource de référence.
function crudRouter(Model, schema, { populate } = {}) {
  const router = Router();
  router.use(authenticate);

  // Lecture autorisée à tous les rôles authentifiés.
  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      let q = Model.find().sort({ nom: 1 });
      if (populate) q = q.populate(populate);
      res.json(await q);
    })
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      let q = Model.findById(req.params.id);
      if (populate) q = q.populate(populate);
      const doc = await q;
      if (!doc) throw new ApiError(404, MSG.RESSOURCE_INTROUVABLE);
      res.json(doc);
    })
  );

  // Écriture réservée à l'admin.
  router.post(
    '/',
    authorize(ROLES.ADMIN),
    asyncHandler(async (req, res) => {
      res.status(201).json(await Model.create(schema.parse(req.body)));
    })
  );

  router.patch(
    '/:id',
    authorize(ROLES.ADMIN),
    asyncHandler(async (req, res) => {
      const doc = await Model.findByIdAndUpdate(req.params.id, schema.partial().parse(req.body), {
        new: true,
        runValidators: true,
      });
      if (!doc) throw new ApiError(404, MSG.RESSOURCE_INTROUVABLE);
      res.json(doc);
    })
  );

  router.delete(
    '/:id',
    authorize(ROLES.ADMIN),
    asyncHandler(async (req, res) => {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) throw new ApiError(404, MSG.RESSOURCE_INTROUVABLE);
      res.json({ ok: true });
    })
  );

  return router;
}

export const groupeRouter = crudRouter(
  Groupe,
  z.object({ nom: z.string().min(1), code: z.string().min(1) }),
  { populate: { path: 'stagiaires', select: 'nom prenom email' } }
);

export const salleRouter = crudRouter(
  Salle,
  z.object({ nom: z.string().min(1), code: z.string().min(1), capacite: z.number().int().positive().optional() })
);

export const moduleRouter = crudRouter(
  Module,
  z.object({ nom: z.string().min(1), code: z.string().min(1), formateur: z.string().optional().nullable() }),
  { populate: { path: 'formateur', select: 'nom prenom email' } }
);
