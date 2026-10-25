import { Router } from 'express';
import { z } from 'zod';
import { HttpError, validate } from '../middleware/errors.js';

const STATUS = ['todo', 'doing', 'done'];
const PRIORITY = ['low', 'medium', 'high'];
const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD')
  .nullable();

// Campos base SIN valores por defecto: asi PATCH solo toca lo que se envia.
const fields = {
  title: z.string().trim().min(1, 'El titulo es obligatorio').max(120),
  description: z.string().trim().max(1000),
  status: z.enum(STATUS),
  priority: z.enum(PRIORITY),
  dueDate: dateStr,
};

const createSchema = z.object({
  title: fields.title,
  description: fields.description.default(''),
  status: fields.status.default('todo'),
  priority: fields.priority.default('medium'),
  dueDate: fields.dueDate.default(null),
});

const updateSchema = z
  .object(fields)
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'Envia al menos un campo para actualizar' });

const listSchema = z.object({
  status: z.enum(STATUS).optional(),
  priority: z.enum(PRIORITY).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['created', 'due', 'priority']).default('created'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const toDto = (t) => ({
  id: t.id,
  title: t.title,
  description: t.description,
  status: t.status,
  priority: t.priority,
  dueDate: t.due_date,
  createdAt: t.created_at,
  updatedAt: t.updated_at,
});

// Orden seguro: solo valores de una lista blanca llegan al SQL.
const ORDER = {
  created: 'created_at DESC, id DESC',
  due: 'due_date IS NULL, due_date ASC, id DESC',
  priority: "CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, id DESC",
};

export function taskRoutes(db) {
  const router = Router();

  const findOwned = (id, userId) => {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId);
    if (!task) throw new HttpError(404, 'Tarea no encontrada');
    return task;
  };

  router.get('/stats', (req, res) => {
    const rows = db
      .prepare('SELECT status, COUNT(*) AS n FROM tasks WHERE user_id = ? GROUP BY status')
      .all(req.userId);
    const stats = { todo: 0, doing: 0, done: 0, total: 0 };
    for (const r of rows) {
      stats[r.status] = r.n;
      stats.total += r.n;
    }
    const overdue = db
      .prepare(
        `SELECT COUNT(*) AS n FROM tasks
         WHERE user_id = ? AND status != 'done' AND due_date IS NOT NULL AND due_date < date('now')`
      )
      .get(req.userId).n;
    res.json({ ...stats, overdue });
  });

  router.get('/', validate(listSchema, 'query'), (req, res) => {
    const { status, priority, q, sort, page, limit } = req.validQuery;

    const where = ['user_id = ?'];
    const params = [req.userId];
    if (status) { where.push('status = ?'); params.push(status); }
    if (priority) { where.push('priority = ?'); params.push(priority); }
    if (q) {
      where.push('(title LIKE ? OR description LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    const clause = where.join(' AND ');

    const total = db.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE ${clause}`).get(...params).n;
    const items = db
      .prepare(`SELECT * FROM tasks WHERE ${clause} ORDER BY ${ORDER[sort]} LIMIT ? OFFSET ?`)
      .all(...params, limit, (page - 1) * limit);

    res.json({
      items: items.map(toDto),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  });

  router.post('/', validate(createSchema), (req, res) => {
    const t = req.body;
    const info = db
      .prepare(
        `INSERT INTO tasks (user_id, title, description, status, priority, due_date)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(req.userId, t.title, t.description, t.status, t.priority, t.dueDate);
    res.status(201).json(toDto(findOwned(info.lastInsertRowid, req.userId)));
  });

  router.get('/:id', validate(idSchema, 'params'), (req, res) => {
    res.json(toDto(findOwned(req.params.id, req.userId)));
  });

  router.patch('/:id', validate(idSchema, 'params'), validate(updateSchema), (req, res) => {
    const current = findOwned(req.params.id, req.userId);
    const b = req.body;

    db.prepare(
      `UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, due_date = ?,
         updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`
    ).run(
      b.title ?? current.title,
      b.description ?? current.description,
      b.status ?? current.status,
      b.priority ?? current.priority,
      b.dueDate === undefined ? current.due_date : b.dueDate,
      current.id,
      req.userId
    );
    res.json(toDto(findOwned(current.id, req.userId)));
  });

  router.delete('/:id', validate(idSchema, 'params'), (req, res) => {
    const task = findOwned(req.params.id, req.userId);
    db.prepare('DELETE FROM tasks WHERE id = ?').run(task.id);
    res.status(204).end();
  });

  return router;
}
