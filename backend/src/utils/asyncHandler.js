// Enveloppe les contrôleurs async pour propager les erreurs vers le middleware d'erreur.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Erreur applicative avec code HTTP.
export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}
