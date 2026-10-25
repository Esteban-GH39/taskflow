import { useEffect, useRef, useState } from 'react';

const EMPTY = { title: '', description: '', status: 'todo', priority: 'medium', dueDate: '' };

/** Dialogo modal para crear o editar. `task` null = crear. */
export default function TaskForm({ open, task, onClose, onSave }) {
  const ref = useRef(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Abre/cierra el <dialog> nativo y precarga los datos.
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) {
      setForm(task ? { ...task, dueDate: task.dueDate || '' } : EMPTY);
      setError('');
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, task]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave(task, {
        title: form.title,
        description: form.description,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate || null,
      });
      onClose();
    } catch (err) {
      setError(err.details?.[0]?.message || err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog ref={ref} className="modal" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <form onSubmit={submit} noValidate>
        <h2>{task ? 'Editar tarea' : 'Nueva tarea'}</h2>

        <label>
          Título
          <input value={form.title} onChange={set('title')} maxLength={120} autoFocus required />
        </label>
        <label>
          Descripción
          <textarea value={form.description} onChange={set('description')} rows={3} maxLength={1000} />
        </label>

        <div className="row">
          <label>
            Estado
            <select value={form.status} onChange={set('status')}>
              <option value="todo">Por hacer</option>
              <option value="doing">En curso</option>
              <option value="done">Hecha</option>
            </select>
          </label>
          <label>
            Prioridad
            <select value={form.priority} onChange={set('priority')}>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </label>
          <label>
            Vence
            <input type="date" value={form.dueDate} onChange={set('dueDate')} />
          </label>
        </div>

        {error && <p className="alert" role="alert">{error}</p>}

        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </dialog>
  );
}
