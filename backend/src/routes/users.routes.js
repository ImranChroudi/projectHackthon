import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';
import * as userService from '../services/userService.js';

const router = Router();

const baseUser = {
  nom: z.string().min(1),
  prenom: z.string().min(1),
  email: z.string().email(),
  role: z.enum([ROLES.ADMIN, ROLES.FORMATEUR, ROLES.STAGIAIRE]),
  groupe: z.string().optional().nullable(),
  modulesAssigned: z.array(z.string()).optional(),
  groupesAssigned: z.array(z.string()).optional(),
};

const createSchema = z.object({ ...baseUser, password: z.string().min(6) });
const updateSchema = z
  .object({ ...baseUser, password: z.string().min(6) })
  .partial();

// Toutes les routes utilisateurs sont réservées à l'admin.
router.use(authenticate, authorize(ROLES.ADMIN));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await userService.listUsers({ role: req.query.role, groupe: req.query.groupe }));
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    res.status(201).json(await userService.createUser(createSchema.parse(req.body)));
  })
);

router.post(
  '/bulk',
  asyncHandler(async (req, res) => {
    const items = z.array(createSchema).parse(req.body);
    res.status(201).json(await userService.bulkCreate(items));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await userService.getUser(req.params.id));
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await userService.updateUser(req.params.id, updateSchema.parse(req.body)));
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await userService.deactivateUser(req.params.id));
  })
);

export default router;
