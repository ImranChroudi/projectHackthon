import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, ApiError } from '../utils/asyncHandler.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES, POST_AUDIENCE } from '../config/constants.js';
import { MSG } from '../utils/messages.fr.js';
import { Post } from '../models/Post.js';

const router = Router();
router.use(authenticate);

const postSchema = z.object({
  titre: z.string().min(1),
  contenu: z.string().min(1),
  audience: z.enum([POST_AUDIENCE.FORMATEURS, POST_AUDIENCE.STAGIAIRES, POST_AUDIENCE.TOUS]),
});

// Annonces visibles par l'utilisateur courant selon son rôle.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    let filter = {};
    if (req.user.role === ROLES.FORMATEUR) {
      filter = { audience: { $in: [POST_AUDIENCE.FORMATEURS, POST_AUDIENCE.TOUS] } };
    } else if (req.user.role === ROLES.STAGIAIRE) {
      filter = { audience: { $in: [POST_AUDIENCE.STAGIAIRES, POST_AUDIENCE.TOUS] } };
    }
    // L'admin voit tout.
    const posts = await Post.find(filter).sort({ createdAt: -1 }).populate('auteur', 'nom prenom');
    res.json(posts);
  })
);

// Création / modification / suppression réservées à l'admin.
router.post(
  '/',
  authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const data = postSchema.parse(req.body);
    const post = await Post.create({ ...data, auteur: req.user._id });
    res.status(201).json(post);
  })
);

router.patch(
  '/:id',
  authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const post = await Post.findByIdAndUpdate(req.params.id, postSchema.partial().parse(req.body), {
      new: true,
    });
    if (!post) throw new ApiError(404, MSG.RESSOURCE_INTROUVABLE);
    res.json(post);
  })
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) throw new ApiError(404, MSG.RESSOURCE_INTROUVABLE);
    res.json({ ok: true });
  })
);

export default router;
