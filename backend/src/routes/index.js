import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import { groupeRouter, salleRouter, moduleRouter } from './reference.routes.js';
import scheduleRoutes from './schedule.routes.js';
import affectationsRoutes from './affectations.routes.js';
import sessionsRoutes from './sessions.routes.js';
import attendanceRoutes from './attendance.routes.js';
import justificationsRoutes from './justifications.routes.js';
import notificationsRoutes from './notifications.routes.js';
import postsRoutes from './posts.routes.js';
import analyticsRoutes from './analytics.routes.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/groupes', groupeRouter);
router.use('/salles', salleRouter);
router.use('/modules', moduleRouter);
router.use('/schedule', scheduleRoutes);
router.use('/affectations', affectationsRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/justifications', justificationsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/posts', postsRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
