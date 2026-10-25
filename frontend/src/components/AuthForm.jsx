import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';

export default function AuthForm() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const switchMode = () => {
    setMode(isRegister ? 'login' : 'register');
    setError('');
    setFieldErrors({});
  };

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setFieldErrors({});
    try {
      if (isRegister) await register(form);
      else await login({ email: form.email, password: form.password });
    } catch (err) {
      setError(err.message);
      setFieldErrors(Object.fromEntries((err.details || []).map((d) => [d.field, d.message])));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <section className="auth-card">
        <div className="brand">
          <span className="logo" aria-hidden="true">✓</span>
          <h1>TaskFlow</h1>
        </div>
        <p className="muted">
          {isRegister ? 'Crea tu cuenta para organizar tus tareas.' : 'Inicia sesión para ver tus tareas.'}
        </p>

        <form onSubmit={onSubmit} noValidate>
          {isRegister && (
            <label>
              Nombre
              <input value={form.name} onChange={set('name')} autoComplete="name" required />
              {fieldErrors.name && <small className="field-error">{fieldErrors.name}</small>}
            </label>
          )}
          <label>
            Correo
            <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
            {fieldErrors.email && <small className="field-error">{fieldErrors.email}</small>}
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
            />
            {fieldErrors.password && <small className="field-error">{fieldErrors.password}</small>}
          </label>

          {error && !Object.keys(fieldErrors).length && <p className="alert" role="alert">{error}</p>}

          <button className="btn primary block" disabled={busy}>
            {busy ? 'Un momento…' : isRegister ? 'Crear cuenta' : 'Entrar'}
          </button>
        </form>

        <p className="switch">
          {isRegister ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}{' '}
          <button type="button" className="link" onClick={switchMode}>
            {isRegister ? 'Inicia sesión' : 'Regístrate'}
          </button>
        </p>
      </section>
    </main>
  );
}
