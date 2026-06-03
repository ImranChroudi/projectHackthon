import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/asyncHandler.js';
import { MSG } from '../utils/messages.fr.js';
import { User } from '../models/User.js';

// Génère un JWT pour un utilisateur.
export function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

// Vérifie le JWT, charge l'utilisateur et l'attache à req.user.
export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new ApiError(401, MSG.NON_AUTHENTIFIE);

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch {
      throw new ApiError(401, MSG.TOKEN_INVALIDE);
    }

    const user = await User.findById(payload.sub);
    if (!user) throw new ApiError(401, MSG.TOKEN_INVALIDE);
    if (!user.active) throw new ApiError(403, MSG.COMPTE_DESACTIVE);

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Restreint l'accès à certains rôles.
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, MSG.NON_AUTHENTIFIE));
    if (roles.length && !roles.includes(req.user.role)) {
      return next(new ApiError(403, MSG.ACCES_REFUSE));
    }
    next();
  };
}
