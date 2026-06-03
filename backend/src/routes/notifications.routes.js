import { Router } from 'express';
import { asyncHandler, ApiError } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { MSG } from '../utils/messages.fr.js';
import { Notification } from '../models/Notification.js';

const router = Router();
router.use(authenticate);

// Mes notifications (les plus récentes en premier).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = { user: req.user._id };
    if (req.query.lu === 'false') filter.lu = false;
    const items = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
    const nonLues = await Notification.countDocuments({ user: req.user._id, lu: false });
    res.json({ nonLues, items });
  })
);

// Marquer une notification comme lue.
router.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { lu: true },
      { new: true }
    );
    if (!notif) throw new ApiError(404, MSG.RESSOURCE_INTROUVABLE);
    res.json(notif);
  })
);

// Tout marquer comme lu.
router.patch(
  '/read-all',
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ user: req.user._id, lu: false }, { lu: true });
    res.json({ ok: true });
  })
);

export default router;
