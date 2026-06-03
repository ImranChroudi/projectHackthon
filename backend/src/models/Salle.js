import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const salleSchema = new Schema(
  {
    nom: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    capacite: { type: Number, default: 30 },
  },
  { timestamps: true }
);

export const Salle = model('Salle', salleSchema);
