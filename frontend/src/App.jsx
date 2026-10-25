import { useAuth } from './AuthContext.jsx';
import AuthForm from './components/AuthForm.jsx';
import Dashboard from './components/Dashboard.jsx';

export default function App() {
  const { user, booting } = useAuth();

  if (booting) return <div className="splash" role="status">Cargando…</div>;
  return user ? <Dashboard /> : <AuthForm />;
}
