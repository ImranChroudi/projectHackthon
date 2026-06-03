import mongoose from 'mongoose';
import { JOURS } from '../config/constants.js';

const { Schema, model } = mongoose;

// Une entrée de l'emploi du temps hebdomadaire (un créneau récurrent).
const entrySchema = new Schema(
  {
    jour: { type: String, enum: JOURS, required: true },
    heureDebut: { type: String, required: true }, // "08:30"
    heureFin: { type: String, required: true }, // "10:30"
    formateur: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    groupe: { type: Schema.Types.ObjectId, ref: 'Groupe', required: true },
    salle: { type: Schema.Types.ObjectId, ref: 'Salle', required: true },
    module: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
  },
  { _id: false }
);

const scheduleTemplateSchema = new Schema(
  {
    nom: { type: String, default: 'Emploi du temps' },
    // Lundi de la semaine couverte par ce modèle (sert de référence à la génération).
    semaineDebut: { type: Date, required: true },
    entries: { type: [entrySchema], default: [] },
  },
  { timestamps: true }
);

export const ScheduleTemplate = model('ScheduleTemplate', scheduleTemplateSchema);
