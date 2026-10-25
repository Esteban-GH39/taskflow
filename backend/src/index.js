import 'dotenv/config';
import crypto from 'node:crypto';
import { openDb } from './db.js';
import { createApp } from './app.js';

const isProd = process.env.NODE_ENV === 'production';
let jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  if (isProd) {
    console.error('Falta la variable JWT_SECRET en produccion.');
    process.exit(1);
  }
  jwtSecret = crypto.randomBytes(32).toString('hex');
  console.warn('JWT_SECRET no definido: usando uno temporal (las sesiones se pierden al reiniciar).');
}

const db = openDb();
const app = createApp({
  db,
  jwtSecret,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  staticDir: process.env.STATIC_DIR,
});

const port = Number(process.env.PORT) || 4000;
const server = app.listen(port, () => console.log(`TaskFlow API escuchando en el puerto ${port}`));

// Cierre ordenado cuando la plataforma reinicia el contenedor.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}
