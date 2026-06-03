import { User } from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { ApiError } from '../utils/asyncHandler.js';
import { MSG } from '../utils/messages.fr.js';

export async function login(email, password) {
  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+passwordHash');
  if (!user) throw new ApiError(401, MSG.IDENTIFIANTS_INVALIDES);
  if (!user.active) throw new ApiError(403, MSG.COMPTE_DESACTIVE);

  const ok = await user.verifyPassword(password);
  if (!ok) throw new ApiError(401, MSG.IDENTIFIANTS_INVALIDES);

  return { token: signToken(user), user: user.toSafeJSON() };
}

// Déconnexion : bloquée tant que le verrou anti-fraude (scanLockUntil) est actif.
export function assertCanLogout(user) {
  if (user.isScanLocked()) {
    throw new ApiError(423, MSG.DECONNEXION_VERROUILLEE); // 423 Locked
  }
}
