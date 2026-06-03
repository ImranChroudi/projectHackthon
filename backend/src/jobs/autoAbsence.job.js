import cron from 'node-cron';
import { env } from '../config/env.js';
import { SESSION_STATUS, ATTENDANCE_STATUS } from '../config/constants.js';
import { Session } from '../models/Session.js';
import { Groupe } from '../models/Groupe.js';
import { Attendance } from '../models/Attendance.js';
import { User } from '../models/User.js';
import { evaluerAlertesAbsence } from '../services/alertService.js';

// Traite une session : marque "absent_injustifie" tout stagiaire du groupe
// sans fiche de présence, une fois la fenêtre de 15 minutes écoulée.
export async function processSession(session, now = new Date()) {
  const groupe = await Groupe.findById(session.groupe).select('stagiaires');
  const stagiaireIds = groupe ? groupe.stagiaires.map((id) => id.toString()) : [];

  // Stagiaires ayant déjà une fiche (présents, en retard, etc.).
  const existantes = await Attendance.find({ session: session._id }).select('stagiaire');
  const dejaPresents = new Set(existantes.map((a) => a.stagiaire.toString()));

  const absents = stagiaireIds.filter((id) => !dejaPresents.has(id));

  let traites = 0;
  for (const stagiaireId of absents) {
    try {
      await Attendance.create({
        session: session._id,
        stagiaire: stagiaireId,
        groupe: session.groupe,
        module: session.module,
        formateur: session.formateur,
        sessionStart: session.start,
        status: ATTENDANCE_STATUS.ABSENT_INJUSTIFIE,
      });
    } catch (err) {
      if (err.code === 11000) continue; // fiche créée entre-temps : on ignore
      throw err;
    }

    // Incrémente le compteur dénormalisé puis évalue les alertes.
    const stagiaire = await User.findByIdAndUpdate(
      stagiaireId,
      { $inc: { absenceCount: 1 } },
      { new: true }
    );
    if (stagiaire) await evaluerAlertesAbsence(stagiaire);
    traites += 1;
  }

  session.absenceProcessed = true;
  if (now >= session.end) session.status = SESSION_STATUS.TERMINE;
  await session.save();
  return traites;
}

// Balaye les sessions dont la fenêtre de scan est dépassée et non encore traitées.
export async function runAutoAbsence(now = new Date()) {
  const limite = new Date(now.getTime() - env.scanWindowMinutes * 60 * 1000);
  const sessions = await Session.find({
    absenceProcessed: false,
    status: { $ne: SESSION_STATUS.PLANIFIE }, // sessions activées uniquement
    start: { $lte: limite },
  });

  let total = 0;
  for (const session of sessions) {
    total += await processSession(session, now);
  }
  if (sessions.length) {
    console.log(`[auto-absence] ${sessions.length} session(s) traitée(s), ${total} absence(s) marquée(s).`);
  }
  return total;
}

export function startAutoAbsenceJob() {
  cron.schedule(env.autoAbsenceCron, () => {
    runAutoAbsence().catch((err) => console.error('[auto-absence] erreur:', err));
  });
  console.log(`[auto-absence] job planifié (${env.autoAbsenceCron}).`);
}
