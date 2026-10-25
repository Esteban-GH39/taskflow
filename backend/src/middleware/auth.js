import jwt from 'jsonwebtoken';
import { HttpError } from './errors.js';

/**
 * Crea el middleware que exige un JWT valido en `Authorization: Bearer <token>`.
 * Deja el id del usuario en `req.userId`.
 */
export function requireAuth(secret) {
  return (req, _res, next) => {
    const header = req.get('authorization') || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new HttpError(401, 'Falta el token de autenticacion');
    }

    try {
      const payload = jwt.verify(token, secret);
      req.userId = Number(payload.sub);
      next();
    } catch {
      throw new HttpError(401, 'Token invalido o expirado');
    }
  };
}

export function signToken(userId, secret, expiresIn = '7d') {
  return jwt.sign({}, secret, { subject: String(userId), expiresIn });
}
