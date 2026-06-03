import ipRangeCheck from 'ip-range-check';
import { env } from '../config/env.js';
import { ApiError } from '../utils/asyncHandler.js';
import { MSG } from '../utils/messages.fr.js';

// Normalise l'IP de la requête (retire le préfixe IPv4-mapped "::ffff:").
export function clientIp(req) {
  let ip = req.ip || req.connection?.remoteAddress || '';
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  return ip;
}

// Bloque la requête si l'IP n'appartient pas au réseau WiFi du centre.
// Utilisé uniquement sur l'endpoint de scan : les autres fonctionnalités
// restent accessibles depuis la maison.
export function wifiGuard(req, _res, next) {
  const ip = clientIp(req);
  if (!ipRangeCheck(ip, env.campusCidrs)) {
    return next(new ApiError(403, MSG.WIFI_REQUIS));
  }
  req.scanIp = ip;
  next();
}
