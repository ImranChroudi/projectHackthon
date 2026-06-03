import mongoose from 'mongoose';
import { NOTIFICATION_TYPE } from '../config/constants.js';

const { Schema, model } = mongoose;

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPE),
      default: NOTIFICATION_TYPE.INFO,
    },
    message: { type: String, required: true },
    lu: { type: Boolean, default: false, index: true },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, lu: 1, createdAt: -1 });

export const Notification = model('Notification', notificationSchema);
