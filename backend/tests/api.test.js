import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';

let server;
let base;
let token;

const call = async (method, path, body, auth = token) => {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
};

before(async () => {
  const app = createApp({ db: openDb(':memory:'), jwtSecret: 'test-secret', rateLimitMax: 1000 });
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test('registro valida los datos', async () => {
  const bad = await call('POST', '/api/auth/register', { name: 'A', email: 'x', password: '123' }, null);
  assert.equal(bad.status, 400);
  assert.ok(bad.data.details.length >= 3);
});

test('registro, login y /me', async () => {
  const reg = await call('POST', '/api/auth/register', {
    name: 'Esteban', email: 'Esteban@Example.com', password: 'supersecreta1',
  }, null);
  assert.equal(reg.status, 201);
  assert.equal(reg.data.user.email, 'esteban@example.com');
  assert.equal(reg.data.user.passwordHash, undefined);

  const dup = await call('POST', '/api/auth/register', {
    name: 'Otro', email: 'esteban@example.com', password: 'supersecreta1',
  }, null);
  assert.equal(dup.status, 409);

  const wrong = await call('POST', '/api/auth/login', { email: 'esteban@example.com', password: 'mala-clave' }, null);
  assert.equal(wrong.status, 401);

  const login = await call('POST', '/api/auth/login', { email: 'esteban@example.com', password: 'supersecreta1' }, null);
  assert.equal(login.status, 200);
  token = login.data.token;

  const me = await call('GET', '/api/auth/me');
  assert.equal(me.data.user.name, 'Esteban');
});

test('las tareas exigen autenticacion', async () => {
  const res = await call('GET', '/api/tasks', null, null);
  assert.equal(res.status, 401);
});

test('CRUD de tareas', async () => {
  const created = await call('POST', '/api/tasks', { title: 'Escribir README', priority: 'high', dueDate: '2030-01-01' });
  assert.equal(created.status, 201);
  assert.equal(created.data.status, 'todo');
  const id = created.data.id;

  const updated = await call('PATCH', `/api/tasks/${id}`, { status: 'done' });
  assert.equal(updated.data.status, 'done');
  assert.equal(updated.data.title, 'Escribir README');
  // Regresion: un PATCH parcial no debe resetear los demas campos.
  assert.equal(updated.data.priority, 'high');
  assert.equal(updated.data.dueDate, '2030-01-01');

  const empty = await call('PATCH', `/api/tasks/${id}`, {});
  assert.equal(empty.status, 400);

  const del = await call('DELETE', `/api/tasks/${id}`);
  assert.equal(del.status, 204);
  assert.equal((await call('GET', `/api/tasks/${id}`)).status, 404);
});

test('filtros, busqueda, paginacion y estadisticas', async () => {
  for (let i = 1; i <= 12; i++) {
    await call('POST', '/api/tasks', { title: `Tarea ${i}`, priority: i % 2 ? 'low' : 'high', status: i > 8 ? 'done' : 'todo' });
  }
  const page1 = await call('GET', '/api/tasks?limit=5&page=1');
  assert.equal(page1.data.items.length, 5);
  assert.equal(page1.data.total, 12);
  assert.equal(page1.data.totalPages, 3);

  const done = await call('GET', '/api/tasks?status=done');
  assert.equal(done.data.total, 4);

  const search = await call('GET', '/api/tasks?q=Tarea%2012');
  assert.equal(search.data.total, 1);

  const stats = await call('GET', '/api/tasks/stats');
  assert.equal(stats.data.total, 12);
  assert.equal(stats.data.done, 4);
});

test('un usuario no puede ver tareas de otro', async () => {
  const other = await call('POST', '/api/auth/register', {
    name: 'Ana', email: 'ana@example.com', password: 'otraclave123',
  }, null);
  const list = await call('GET', '/api/tasks', null, other.data.token);
  assert.equal(list.data.total, 0);

  const mine = await call('GET', '/api/tasks?limit=1');
  const foreign = await call('GET', `/api/tasks/${mine.data.items[0].id}`, null, other.data.token);
  assert.equal(foreign.status, 404);
});
