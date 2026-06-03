import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { login, assertCanLogout } from '../services/authService.js';
import { MSG } from '../utils/messages.fr.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await login(email, password, req.get('X-Device-Id'));
    res.json(result);
  })
);

router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    // L'anti-fraude empêche la déconnexion pendant la fenêtre de présence.
    assertCanLogout(req.user);
    res.json({ message: MSG.DECONNEXION_OK });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user.toSafeJSON() });
  })
);

export default router;
