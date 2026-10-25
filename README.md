# TaskFlow

Gestor de tareas full stack con autenticación. Cada usuario tiene su propio espacio: crea, edita, filtra, busca y ordena tareas, con paginación y estadísticas en vivo.

**Stack:** React 19 + Vite · Node.js + Express 5 · SQLite (`node:sqlite`, integrado en Node) · JWT · Zod

## Qué demuestra

| Concepto | Dónde verlo |
| --- | --- |
| API REST (CRUD, códigos HTTP correctos) | `backend/src/routes/tasks.js` |
| Autenticación con JWT y hash de contraseñas (bcrypt) | `backend/src/routes/auth.js`, `middleware/auth.js` |
| Validación de entrada con esquemas (Zod) | `middleware/errors.js`, `routes/*.js` |
| Autorización por recurso (un usuario no ve datos de otro) | `findOwned` en `routes/tasks.js` |
| Consultas SQL parametrizadas, filtros, orden por lista blanca, paginación | `routes/tasks.js` |
| Seguridad básica: helmet, CORS, rate limiting | `backend/src/app.js` |
| Manejo centralizado de errores | `middleware/errors.js` |
| Tests de integración (`node:test`) | `backend/tests/api.test.js` |
| Context API, hooks personalizados, debounce | `AuthContext.jsx`, `hooks.js` |
| Actualización optimista con rollback | `changeStatus` en `hooks.js` |
| Control de condiciones de carrera en peticiones | `requestId` en `hooks.js` |
| Modo oscuro, diseño responsive, accesibilidad (`<dialog>`, `aria-*`) | `styles.css`, `components/` |

## Ejecutar en local

Requiere Node.js 22.5 o superior. El SQLite viene integrado en Node, así que no hay dependencias nativas que compilar.

```bash
# Terminal 1: API
cd backend
cp .env.example .env
npm install
npm run dev          # http://localhost:4000

# Terminal 2: frontend
cd frontend
npm install
npm run dev          # http://localhost:5173 (proxy a /api)
```

Tests del backend: `cd backend && npm test`

## Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/api/auth/register` | Crea cuenta, devuelve token |
| POST | `/api/auth/login` | Inicia sesión, devuelve token |
| GET | `/api/auth/me` | Usuario actual |
| GET | `/api/tasks` | Lista con `status`, `priority`, `q`, `sort`, `page`, `limit` |
| GET | `/api/tasks/stats` | Conteos por estado y vencidas |
| POST | `/api/tasks` | Crea tarea |
| GET/PATCH/DELETE | `/api/tasks/:id` | Lee, actualiza parcialmente o elimina |

Las rutas de tareas requieren `Authorization: Bearer <token>`.
