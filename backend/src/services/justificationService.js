import {
  ATTENDANCE_STATUS,
  JUSTIFICATION_STATUS,
  NOTIFICATION_TYPE,
} from '../config/constants.js';
import { ApiError } from '../utils/asyncHandler.js';
import { MSG } from '../utils/messages.fr.js';
import { Attendance } from '../models/Attendance.js';
import { Justification } from '../models/Justification.js';
import { User } from '../models/User.js';
import { notifier } from './alertService.js';

// Le stagiaire soumet une justification pour une absence injustifiée.
export async function soumettre({ attendanceId, stagiaire, texte, documents }) {
  const attendance = await Attendance.findById(attendanceId);
  if (!attendance) throw new ApiError(404, MSG.RESSOURCE_INTROUVABLE);
  if (String(attendance.stagiaire) !== String(stagiaire._id)) {
    throw new ApiError(403, MSG.ACCES_REFUSE);
  }
  // On ne justifie qu'une absence injustifiée.
  if (
    ![ATTENDANCE_STATUS.ABSENT_INJUSTIFIE].includes(attendance.status)
  ) {
    throw new ApiError(409, MSG.JUSTIF_NON_ABSENT);
  }

  const justification = await Justification.create({
    attendance: attendance._id,
    stagiaire: stagiaire._id,
    texte: texte || '',
    documents: (documents || []).map((f) => ({
      filename: f.filename,
      originalName: f.originalname,
      path: f.path,
      mimetype: f.mimetype,
      size: f.size,
    })),
  });

  attendance.status = ATTENDANCE_STATUS.JUSTIFICATION_EN_ATTENTE;
  attendance.justification = justification._id;
  await attendance.save();

  return justification;
}

export async function listerQueue(statut = JUSTIFICATION_STATUS.EN_ATTENTE) {
  return Justification.find({ statut })
    .sort({ createdAt: 1 })
    .populate('stagiaire', 'nom prenom email')
    .populate({ path: 'attendance', populate: { path: 'module', select: 'nom code' } });
}

// L'admin approuve ou refuse une justification.
export async function traiter({ justificationId, admin, decision, motifRefus }) {
  const justification = await Justification.findById(justificationId);
  if (!justification) throw new ApiError(404, MSG.JUSTIF_INTROUVABLE);
  if (justification.statut !== JUSTIFICATION_STATUS.EN_ATTENTE) {
    throw new ApiError(409, MSG.JUSTIF_TRAITEE);
  }

  const attendance = await Attendance.findById(justification.attendance);

  if (decision === JUSTIFICATION_STATUS.APPROUVE) {
    justification.statut = JUSTIFICATION_STATUS.APPROUVE;
    if (attendance) {
      attendance.status = ATTENDANCE_STATUS.ABSENT_JUSTIFIE;
      await attendance.save();
      // L'absence devient justifiée : on décrémente le compteur (sans passer sous 0).
      await User.updateOne(
        { _id: justification.stagiaire, absenceCount: { $gt: 0 } },
        { $inc: { absenceCount: -1 } }
      );
    }
    await notifier(
      justification.stagiaire,
      NOTIFICATION_TYPE.JUSTIF_STATUT,
      'Votre justification a été approuvée. Absence régularisée.'
    );
  } else {
    justification.statut = JUSTIFICATION_STATUS.REFUSE;
    justification.motifRefus = motifRefus || '';
    if (attendance) {
      // Reste une absence injustifiée.
      attendance.status = ATTENDANCE_STATUS.ABSENT_INJUSTIFIE;
      await attendance.save();
    }
    await notifier(
      justification.stagiaire,
      NOTIFICATION_TYPE.JUSTIF_STATUT,
      `Votre justification a été refusée.${motifRefus ? ' Motif : ' + motifRefus : ''}`
    );
  }

  justification.reviewedBy = admin._id;
  justification.reviewedAt = new Date();
  await justification.save();
  return justification;
}

// Le stagiaire consulte ses propres justifications.
export async function mesJustifications(stagiaireId) {
  return Justification.find({ stagiaire: stagiaireId })
    .sort({ createdAt: -1 })
    .populate({ path: 'attendance', populate: { path: 'module', select: 'nom code' } });
}
