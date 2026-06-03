import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const moduleSchema = new Schema(
  {
    nom: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    formateur: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export const Module = model('Module', moduleSchema);
