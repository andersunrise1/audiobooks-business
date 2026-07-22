import { Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext.jsx';

function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
      <Link to="/" className="font-bold text-lg">
        TechSpeak
      </Link>

      <nav className="flex items-center gap-4 text-sm">
        <Link to="/audiobooks">Audiobooks</Link>

        {isAuthenticated ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <span className="text-slate-500">{user?.name || user?.email}</span>
            <button type="button" onClick={logout} className="text-slate-500 underline">
              Sair
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Entrar</Link>
            <Link to="/register">Criar conta</Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default Navbar;
