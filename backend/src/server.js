import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { startAutoAbsenceJob } from './jobs/autoAbsence.job.js';

async function bootstrap() {
  await connectDB();
  const app = createApp();

  // Démarre le job planifié de la règle des 15 minutes.
  startAutoAbsenceJob();

  app.listen(env.port, () => {
    console.log(`[server] API démarrée sur http://localhost:${env.port}/api`);
  });
}

bootstrap().catch((err) => {
  console.error('[server] échec du démarrage :', err);
  process.exit(1);
});
