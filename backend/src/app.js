import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  // Nécessaire pour récupérer la vraie IP derrière un proxy (contrôle WiFi).
  app.set('trust proxy', true);

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  if (env.nodeEnv !== 'test') app.use(morgan('dev'));

  // Fichiers justificatifs servis statiquement.
  app.use('/uploads', express.static(path.resolve(process.cwd(), env.uploadDir)));

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
