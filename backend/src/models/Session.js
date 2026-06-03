import mongoose from 'mongoose';
import { SESSION_STATUS } from '../config/constants.js';

const { Schema, model } = mongoose;

const sessionSchema = new Schema(
  {
    formateur: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    groupe: { type: Schema.Types.ObjectId, ref: 'Groupe', required: true, index: true },
    salle: { type: Schema.Types.ObjectId, ref: 'Salle', required: true },
    module: { type: Schema.Types.ObjectId, ref: 'Module', required: true, index: true },

    start: { type: Date, required: true, index: true },
    end: { type: Date, required: true },

    status: {
      type: String,
      enum: Object.values(SESSION_STATUS),
      default: SESSION_STATUS.PLANIFIE,
    },

    // QR dynamique : on stocke la dernière rotation pour information / audit.
    qrToken: { type: String, default: null },
    qrTokenExpiresAt: { type: Date, default: null }, // start + fenêtre de scan
    qrRotatedAt: { type: Date, default: null },

    // Marqueur d'idempotence pour le job des 15 minutes.
    absenceProcessed: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

sessionSchema.index({ status: 1, absenceProcessed: 1, start: 1 });
sessionSchema.index({ groupe: 1, start: 1 });

export const Session = model('Session', sessionSchema);
