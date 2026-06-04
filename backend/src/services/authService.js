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
    const now = new Date();
    const locker = await User.findOne({
      scanLockDevice: deviceId,
      scanLockUntil: { $gt: now },
    });
    if (locker && String(locker._id) !== String(user._id)) {
      const minutes = Math.max(1, Math.ceil((locker.scanLockUntil - now) / 60000));
      throw new ApiError(423, MSG.CONNEXION_VERROUILLEE(minutes));
    }
  }

  return { token: signToken(user), user: user.toSafeJSON() };
}

// Déconnexion : bloquée tant que le verrou anti-fraude (scanLockUntil) est actif.
// Le message indique les minutes restantes pour rester clair (« 15 min » au départ,
// puis le décompte réel jusqu'à la levée automatique du verrou).
export function assertCanLogout(user, now = new Date()) {
  if (user.isScanLocked(now)) {
    const minutes = Math.max(1, Math.ceil((user.scanLockUntil - now) / 60000));
    throw new ApiError(423, MSG.DECONNEXION_VERROUILLEE(minutes)); // 423 Locked
  }
}
