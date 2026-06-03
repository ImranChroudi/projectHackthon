import { env } from '../config/env.js';
import { ROLES, NOTIFICATION_TYPE } from '../config/constants.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';

// Évalue le compteur d'absences d'un stagiaire et émet les alertes adéquates.
// Appelé après chaque nouvelle absence injustifiée.
export async function evaluerAlertesAbsence(stagiaire) {
  const count = stagiaire.absenceCount;
  const notifications = [];

  // Limite stricte atteinte/dépassée -> notifier TOUS les admins immédiatement.
  if (count >= env.limiteStricte) {
    const admins = await User.find({ role: ROLES.ADMIN, active: true }).select('_id');
    for (const admin of admins) {
      notifications.push({
        user: admin._id,
        type: NOTIFICATION_TYPE.LIMITE_ATTEINTE,
        message: `Le stagiaire ${stagiaire.prenom} ${stagiaire.nom} a atteint la limite stricte d'absences (${count}).`,
        meta: { stagiaire: stagiaire._id, count },
      });
    }
    // Informer aussi le stagiaire.
    notifications.push({
      user: stagiaire._id,
      type: NOTIFICATION_TYPE.LIMITE_ATTEINTE,
      message: `Vous avez atteint la limite d'absences autorisée (${count}). Votre situation est signalée à l'administration.`,
      meta: { count },
    });
  } else if (count >= env.seuilProche) {
    // Seuil d'alerte approché -> prévenir le stagiaire.
    notifications.push({
      user: stagiaire._id,
      type: NOTIFICATION_TYPE.SEUIL_PROCHE,
      message: `Attention : vous approchez de la limite d'absences (${count}/${env.limiteStricte}).`,
      meta: { count, limite: env.limiteStricte },
    });
  }

  if (notifications.length) await Notification.insertMany(notifications);
  return notifications.length;
}

export async function notifier(userId, type, message, meta = {}) {
  return Notification.create({ user: userId, type, message, meta });
}
