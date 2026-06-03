import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../config/constants.js';

const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    nom: { type: String, required: true, trim: true },
    prenom: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), required: true, index: true },

    // Stagiaire : groupe d'appartenance
    groupe: { type: Schema.Types.ObjectId, ref: 'Groupe', default: null, index: true },

    // Formateur : affectations (périmètre du tableau de bord formateur)
    modulesAssigned: [{ type: Schema.Types.ObjectId, ref: 'Module' }],
    groupesAssigned: [{ type: Schema.Types.ObjectId, ref: 'Groupe' }],

    // Formateur : plafond d'heures hebdomadaires (contrainte du générateur d'emploi du temps)
    heuresHebdo: { type: Number, default: 25 },

    // Compteur dénormalisé d'absences injustifiées (pour alertes + tri rapide)
    absenceCount: { type: Number, default: 0, index: true },

    // Anti-fraude : empêche la déconnexion / reconnexion ailleurs jusqu'à cette date
    scanLockUntil: { type: Date, default: null },
    // Appareil (deviceId) depuis lequel le scan verrouillant a été effectué.
    // Sert à refuser une connexion vers un AUTRE compte sur le même appareil.
    scanLockDevice: { type: String, default: null },

    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.isScanLocked = function isScanLocked(now = new Date()) {
  return this.scanLockUntil && this.scanLockUntil > now;
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

export const User = model('User', userSchema);
