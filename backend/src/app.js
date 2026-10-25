import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { authRoutes } from './routes/auth.js';
import { taskRoutes } from './routes/tasks.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';

/**
 * Construye la app de Express sin arrancar el servidor.
 * Recibir la base de datos y el secreto por parametro facilita los tests.
 */
export function createApp({ db, jwtSecret, corsOrigin = '*', staticDir, rateLimitMax = 100 }) {
  const app = express();

  app.set('trust proxy', 1); // Render/Railway/Fly estan detras de un proxy
  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((s) => s.trim()),
    })
  );
  app.use(express.json({ limit: '50kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

  // Limite mas estricto en login/registro para frenar fuerza bruta.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos, vuelve a intentarlo mas tarde' },
  });

  app.use('/api/auth', authLimiter, authRoutes(db, jwtSecret));
  app.use('/api/tasks', requireAuth(jwtSecret), taskRoutes(db));

  // Opcional: servir el frontend compilado desde el mismo servidor.
  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.resolve(staticDir, 'index.html')));
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
