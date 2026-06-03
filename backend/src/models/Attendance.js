import mongoose from 'mongoose';
import { ATTENDANCE_STATUS } from '../config/constants.js';

const { Schema, model } = mongoose;

const attendanceSchema = new Schema(
  {
    session: { type: Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
    stagiaire: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Champs dénormalisés depuis la session pour des agrégations efficaces.
    groupe: { type: Schema.Types.ObjectId, ref: 'Groupe', required: true, index: true },
    module: { type: Schema.Types.ObjectId, ref: 'Module', required: true, index: true },
    formateur: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    // Début de session copié pour les agrégations par jour/créneau (sans $lookup).
    sessionStart: { type: Date, index: true },

    status: {
      type: String,
      enum: Object.values(ATTENDANCE_STATUS),
      required: true,
      index: true,
    },

    scannedAt: { type: Date, default: null },
    scanIp: { type: String, default: null },

    // Marquage manuel par un formateur/admin (repli si le QR ne fonctionne pas).
    markedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    justification: { type: Schema.Types.ObjectId, ref: 'Justification', default: null },
  },
  { timestamps: true }
);

// Une seule fiche de présence par (session, stagiaire).
attendanceSchema.index({ session: 1, stagiaire: 1 }, { unique: true });
// Index composés pour les tableaux de bord analytiques.
attendanceSchema.index({ module: 1, status: 1 });
attendanceSchema.index({ groupe: 1, status: 1 });
attendanceSchema.index({ stagiaire: 1, status: 1 });

export const Attendance = model('Attendance', attendanceSchema);
