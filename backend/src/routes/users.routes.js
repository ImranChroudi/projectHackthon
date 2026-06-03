import { Router } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { z } from 'zod';
import { asyncHandler, ApiError } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { ROLES } from '../config/constants.js';
import * as userService from '../services/userService.js';
import { Groupe } from '../models/Groupe.js';

const router = Router();

const csvUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const accepted = ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'];
    if (accepted.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Type de fichier non autorisé (CSV attendu).'));
    }
  },
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
});

function parseCsv(text) {
  const rows = text.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
  if (!rows.length) return [];
  const delimiter = rows[0].includes(';') ? ';' : ',';
  const parseLine = (line) => {
    const regex = new RegExp(`(?:("([^"]*(?:""[^"]*)*)")|([^"${delimiter}]*))(?:${delimiter}|$)`, 'g');
    const values = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
      let value = match[2] ?? match[3] ?? '';
      value = value.trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1).replace(/""/g, '"');
      }
      values.push(value);
      if (regex.lastIndex >= line.length) break;
    }
    return values;
  };
  const headers = parseLine(rows[0]).map((header) => header.toLowerCase().trim());
  return rows.slice(1).map((row) => {
    const values = parseLine(row);
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {});
  }).filter((item) => item.prenom || item.nom || item.email);
};

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
const importUserSchema = z.object({ ...baseUser, password: z.string().min(6).optional() });
const updateSchema = z
  .object({ ...baseUser, password: z.string().min(6) })
  .partial();

// Toutes les routes utilisateurs sont réservées à l'admin.
router.use(authenticate, authorize(ROLES.ADMIN));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { role, groupe, module, active, search } = req.query;
    res.json(await userService.listUsers({ role, groupe, module, active, search }));
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
    const items = z.array(importUserSchema).parse(req.body);
    res.status(201).json(await userService.bulkCreate(items));
  })
);

router.post(
  '/import',
  csvUpload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file || !req.file.buffer) {
      throw new ApiError(400, 'Fichier CSV manquant.');
    }
    const role = req.query.role === ROLES.STAGIAIRE ? ROLES.STAGIAIRE : ROLES.FORMATEUR;
    const text = req.file.buffer.toString('utf8');
    const rows = parseCsv(text);
    if (!rows.length) {
      throw new ApiError(400, 'Aucun utilisateur valide trouvé dans le CSV.');
    }

    const items = await Promise.all(
      rows.map(async (row, index) => {
        const prenom = (row.prenom || '').trim();
        const nom = (row.nom || '').trim();
        const email = (row.email || '').trim().toLowerCase();
        if (!prenom || !nom || !email) {
          throw new ApiError(400, `Ligne ${index + 2} invalide : prénom, nom et email sont obligatoires.`);
        }

        const item = {
          prenom,
          nom,
          email,
          role,
          password: row.password?.trim() || undefined,
          heuresHebdo: row.heuresHebdo ? Number(row.heuresHebdo) : undefined,
        };

        if (role === ROLES.STAGIAIRE && row.groupe) {
          const groupRef = row.groupe.trim();
          if (mongoose.Types.ObjectId.isValid(groupRef)) {
            item.groupe = groupRef;
          } else {
            const groupe = await Groupe.findOne({ code: groupRef });
            if (!groupe) {
              throw new ApiError(400, `Ligne ${index + 2} invalide : groupe '${groupRef}' introuvable.`);
            }
            item.groupe = groupe._id;
          }
        }

        return item;
      })
    );
    const created = await userService.bulkCreate(items);
    res.status(201).json(created);
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
