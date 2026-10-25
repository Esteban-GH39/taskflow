const PRIORITY_LABEL = { low: 'Baja', medium: 'Media', high: 'Alta' };

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TaskCard({ task, onEdit, onDelete, onStatus }) {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = task.dueDate && task.status !== 'done' && task.dueDate < today;

  return (
    <li className={`task ${task.status === 'done' ? 'is-done' : ''}`}>
      <div className="task-main">
        <h3>{task.title}</h3>
        {task.description && <p className="muted">{task.description}</p>}
        <div className="meta">
          <span className={`tag p-${task.priority}`}>{PRIORITY_LABEL[task.priority]}</span>
          {task.dueDate && (
            <span className={`tag ${overdue ? 'p-high' : ''}`}>
              {overdue ? 'Vencida · ' : 'Vence · '}
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>

      <div className="task-actions">
        <select
          aria-label={`Estado de ${task.title}`}
          value={task.status}
          onChange={(e) => onStatus(task, e.target.value)}
        >
          <option value="todo">Por hacer</option>
          <option value="doing">En curso</option>
          <option value="done">Hecha</option>
        </select>
        <button className="btn small" onClick={() => onEdit(task)}>Editar</button>
        <button className="btn small danger" onClick={() => onDelete(task)}>Eliminar</button>
      </div>
    </li>
  );
}
