import { useMemo, useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { useDebounce, useTasks } from '../hooks.js';
import TaskCard from './TaskCard.jsx';
import TaskForm from './TaskForm.jsx';

const LIMIT = 6;

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [sort, setSort] = useState('created');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const q = useDebounce(search);
  // useMemo mantiene la misma referencia mientras los filtros no cambien,
  // asi el hook solo vuelve a pedir datos cuando realmente hace falta.
  const filters = useMemo(
    () => ({ q, status, priority, sort, page, limit: LIMIT }),
    [q, status, priority, sort, page]
  );
  const { items, total, totalPages, stats, loading, error, save, remove, changeStatus } = useTasks(filters);

  // Cualquier cambio de filtro vuelve a la primera pagina.
  const onFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const openForm = (task = null) => {
    setEditing(task);
    setFormOpen(true);
  };

  const onDelete = async (task) => {
    if (window.confirm(`¿Eliminar "${task.title}"?`)) {
      await remove(task);
      if (items.length === 1 && page > 1) setPage(page - 1);
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true">✓</span>
          <h1>TaskFlow</h1>
        </div>
        <div className="user">
          <span className="muted">Hola, {user.name.split(' ')[0]}</span>
          <button className="btn small" onClick={logout}>Salir</button>
        </div>
      </header>

      <main>
        <section className="stats" aria-label="Resumen">
          <Stat label="Total" value={stats.total} />
          <Stat label="Por hacer" value={stats.todo} />
          <Stat label="En curso" value={stats.doing} />
          <Stat label="Hechas" value={stats.done} accent="ok" />
          <Stat label="Vencidas" value={stats.overdue} accent={stats.overdue ? 'bad' : ''} />
        </section>

        <section className="toolbar">
          <input
            type="search"
            placeholder="Buscar tareas…"
            aria-label="Buscar tareas"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select aria-label="Filtrar por estado" value={status} onChange={onFilter(setStatus)}>
            <option value="">Todos los estados</option>
            <option value="todo">Por hacer</option>
            <option value="doing">En curso</option>
            <option value="done">Hechas</option>
          </select>
          <select aria-label="Filtrar por prioridad" value={priority} onChange={onFilter(setPriority)}>
            <option value="">Toda prioridad</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
          <select aria-label="Ordenar" value={sort} onChange={onFilter(setSort)}>
            <option value="created">Más recientes</option>
            <option value="due">Por vencimiento</option>
            <option value="priority">Por prioridad</option>
          </select>
          <button className="btn primary" onClick={() => openForm()}>+ Nueva tarea</button>
        </section>

        {error && <p className="alert" role="alert">{error}</p>}

        <ul className={`tasks ${loading ? 'is-loading' : ''}`} aria-busy={loading}>
          {items.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={openForm} onDelete={onDelete} onStatus={changeStatus} />
          ))}
        </ul>

        {!loading && items.length === 0 && (
          <div className="empty">
            <p>{search || status || priority ? 'Ninguna tarea coincide con los filtros.' : 'Aún no tienes tareas.'}</p>
            {!(search || status || priority) && (
              <button className="btn primary" onClick={() => openForm()}>Crea la primera</button>
            )}
          </div>
        )}

        {totalPages > 1 && (
          <nav className="pager" aria-label="Paginación">
            <button className="btn small" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Anterior</button>
            <span className="muted">Página {page} de {totalPages} · {total} tareas</span>
            <button className="btn small" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente →</button>
          </nav>
        )}
      </main>

      <TaskForm open={formOpen} task={editing} onClose={() => setFormOpen(false)} onSave={save} />
    </div>
  );
}

function Stat({ label, value, accent = '' }) {
  return (
    <div className={`stat ${accent}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
