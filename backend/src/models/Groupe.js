import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const groupeSchema = new Schema(
  {
    nom: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    stagiaires: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export const Groupe = model('Groupe', groupeSchema);
