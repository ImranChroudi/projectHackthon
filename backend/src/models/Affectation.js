import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// Affectation = "ce qu'il faut planifier" : un module enseigné à un groupe par un
// formateur, à raison de X heures par semaine. Source de vérité du générateur d'emploi du temps.
const affectationSchema = new Schema(
  {
    groupe: { type: Schema.Types.ObjectId, ref: 'Groupe', required: true, index: true },
    module: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
    formateur: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    heuresParSemaine: { type: Number, default: 5, min: 1 },
  },
  { timestamps: true }
);

// Un module n'est affecté qu'une fois par groupe.
affectationSchema.index({ groupe: 1, module: 1 }, { unique: true });

export const Affectation = model('Affectation', affectationSchema);
