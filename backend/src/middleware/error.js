import { ZodError } from 'zod';
import { ApiError } from '../utils/asyncHandler.js';
import { MSG } from '../utils/messages.fr.js';
import { env } from '../config/env.js';

export function notFound(req, res) {
  res.status(404).json({ message: MSG.RESSOURCE_INTROUVABLE });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Erreurs de validation Zod
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: MSG.VALIDATION_ECHEC,
      details: err.issues.map((i) => ({ champ: i.path.join('.'), message: i.message })),
    });
  }

  // Clé dupliquée Mongo
  if (err && err.code === 11000) {
    return res.status(409).json({ message: MSG.EMAIL_DEJA_UTILISE });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ message: err.message, details: err.details });
  }

  console.error('[error]', err);
  res.status(500).json({
    message: MSG.ERREUR_SERVEUR,
    ...(env.nodeEnv === 'development' ? { debug: err.message } : {}),
  });
}
