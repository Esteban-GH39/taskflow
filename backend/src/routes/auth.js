import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { HttpError, validate } from '../middleware/errors.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(60),
  email: z.string().trim().toLowerCase().email('Correo invalido'),
  password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres').max(72),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo invalido'),
  password: z.string().min(1, 'La contrasena es obligatoria'),
});

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, createdAt: u.created_at });

export function authRoutes(db, secret) {
  const router = Router();

  router.post('/register', validate(registerSchema), (req, res) => {
    const { name, email, password } = req.body;

    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) throw new HttpError(409, 'Ya existe una cuenta con ese correo');

    const hash = bcrypt.hashSync(password, 10);
    const info = db
      .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run(name, email, hash);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ token: signToken(user.id, secret), user: publicUser(user) });
  });

  router.post('/login', validate(loginSchema), (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    // Mismo mensaje para correo o clave incorrectos: no revela si la cuenta existe.
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      throw new HttpError(401, 'Credenciales incorrectas');
    }
    res.json({ token: signToken(user.id, secret), user: publicUser(user) });
  });

  router.get('/me', requireAuth(secret), (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    if (!user) throw new HttpError(401, 'Usuario no encontrado');
    res.json({ user: publicUser(user) });
  });

  return router;
}
