import { User } from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { ApiError } from '../utils/asyncHandler.js';
import { MSG } from '../utils/messages.fr.js';

export async function login(email, password, deviceId = null) {
  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+passwordHash');
  if (!user) throw new ApiError(401, MSG.IDENTIFIANTS_INVALIDES);
  if (!user.active) throw new ApiError(403, MSG.COMPTE_DESACTIVE);

  const ok = await user.verifyPassword(password);
  if (!ok) throw new ApiError(401, MSG.IDENTIFIANTS_INVALIDES);

  // Anti-fraude : si cet appareil porte un verrou de scan actif posé par un AUTRE
  // compte, on refuse la connexion (empêche de scanner pour un ami en changeant
  // de compte sur le même appareil). Se reconnecter sur le même compte reste permis.
  if (deviceId) {
    const locker = await User.findOne({
      scanLockDevice: deviceId,
      scanLockUntil: { $gt: new Date() },
    });
    if (locker && String(locker._id) !== String(user._id)) {
      throw new ApiError(423, MSG.CONNEXION_VERROUILLEE);
    }
  }

  return { token: signToken(user), user: user.toSafeJSON() };
}

// Déconnexion : bloquée tant que le verrou anti-fraude (scanLockUntil) est actif.
export function assertCanLogout(user) {
  if (user.isScanLocked()) {
    throw new ApiError(423, MSG.DECONNEXION_VERROUILLEE); // 423 Locked
  }
}
