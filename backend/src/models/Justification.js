import mongoose from 'mongoose';
import { JUSTIFICATION_STATUS } from '../config/constants.js';

const { Schema, model } = mongoose;

const documentSchema = new Schema(
  {
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number,
  },
  { _id: false }
);

const justificationSchema = new Schema(
  {
    attendance: { type: Schema.Types.ObjectId, ref: 'Attendance', required: true, index: true },
    stagiaire: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    texte: { type: String, default: '' },
    documents: { type: [documentSchema], default: [] },

    statut: {
      type: String,
      enum: Object.values(JUSTIFICATION_STATUS),
      default: JUSTIFICATION_STATUS.EN_ATTENTE,
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    motifRefus: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Justification = model('Justification', justificationSchema);
