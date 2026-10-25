import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

/** Devuelve `value` solo despues de que deja de cambiar durante `delay` ms. */
export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/**
 * Carga tareas segun los filtros y expone acciones CRUD.
 * El cambio de estado es optimista: la UI se actualiza al instante
 * y se revierte si el servidor rechaza la peticion.
 */
export function useTasks(filters) {
  const [data, setData] = useState({ items: [], total: 0, totalPages: 1 });
  const [stats, setStats] = useState({ todo: 0, doing: 0, done: 0, total: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current; // evita que una respuesta vieja pise a una nueva
    setLoading(true);
    setError('');
    try {
      const [list, s] = await Promise.all([api.listTasks(filters), api.stats()]);
      if (id !== requestId.current) return;
      setData(list);
      setStats(s);
    } catch (e) {
      if (id === requestId.current) setError(e.message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (task, values) => {
    if (task) await api.updateTask(task.id, values);
    else await api.createTask(values);
    await load();
  };

  const remove = async (task) => {
    await api.deleteTask(task.id);
    await load();
  };

  const changeStatus = async (task, status) => {
    const previous = data;
    setData({ ...data, items: data.items.map((t) => (t.id === task.id ? { ...t, status } : t)) });
    try {
      await api.updateTask(task.id, { status });
      api.stats().then(setStats).catch(() => {});
    } catch (e) {
      setData(previous);
      setError(e.message);
    }
  };

  return { ...data, stats, loading, error, reload: load, save, remove, changeStatus };
}
