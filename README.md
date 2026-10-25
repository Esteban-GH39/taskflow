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

## Despliegue

Hay dos opciones. La **A** es la más simple.

### Opción A: un solo servicio (Render, Railway, Fly.io)

El backend sirve el frontend compilado.

1. Sube la carpeta `taskflow/` a un repositorio de GitHub.
2. En Render crea un **Web Service** apuntando al repo y usa:
   - **Build command:** `cd frontend && npm install && npm run build && cd ../backend && npm install`
   - **Start command:** `cd backend && npm start`
3. Variables de entorno:
   - `NODE_VERSION=22`
   - `NODE_ENV=production`
   - `JWT_SECRET=` (un valor largo y aleatorio)
   - `STATIC_DIR=../frontend/dist`
   - `DB_PATH=/var/data/taskflow.db`
4. Añade un **Disk** (volumen persistente) montado en `/var/data`. Sin disco, SQLite se borra en cada despliegue en los planes gratuitos.

> El repositorio incluye `render.yaml` con esta configuración lista para usar como Blueprint.

### Opción B: frontend en Vercel + backend en Render

1. Despliega el backend como en la opción A, pero sin `STATIC_DIR`, y define `CORS_ORIGIN=https://tu-app.vercel.app`.
2. En Vercel importa la carpeta `frontend/` (preset Vite) y define `VITE_API_URL=https://tu-backend.onrender.com`.

## Ideas para ampliar

- Etiquetas y subtareas
- Refresh tokens con cookies `httpOnly`
- Migración a PostgreSQL
- Tests de componentes con Vitest + Testing Library
