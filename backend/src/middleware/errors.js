import { ZodError } from 'zod';

/** Error con codigo HTTP, para lanzarlo desde cualquier ruta. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/**
 * Middleware de validacion: parsea `req[source]` con un esquema de Zod
 * y reemplaza el valor por el resultado ya limpio y tipado.
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) throw result.error;
    // En Express 5 `req.query` es de solo lectura, por eso se guarda aparte.
    if (source === 'query') req.validQuery = result.data;
    else req[source] = result.data;
    next();
  };
}

export function notFound(_req, _res, next) {
  next(new HttpError(404, 'Ruta no encontrada'));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Datos invalidos',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON malformado' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}
