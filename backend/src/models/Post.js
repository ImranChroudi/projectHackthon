import mongoose from 'mongoose';
import { POST_AUDIENCE } from '../config/constants.js';

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

const postSchema = new Schema(
  {
    auteur: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    titre: { type: String, required: true, trim: true },
    contenu: { type: String, required: true },
    audience: {
      type: String,
      enum: Object.values(POST_AUDIENCE),
      default: POST_AUDIENCE.TOUS,
      index: true,
    },
    // Pièces jointes optionnelles (documents partagés avec l'annonce).
    piecesJointes: { type: [documentSchema], default: [] },
  },
  { timestamps: true }
);

export const Post = model('Post', postSchema);
