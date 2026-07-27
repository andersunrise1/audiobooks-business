import { Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext.jsx';
import SyncStatusIndicator from '../features/SyncStatusIndicator.jsx';
import NotificationCenter from '../features/NotificationCenter.jsx';

function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
      <Link to="/" className="font-bold text-lg">
        TechSpeak
      </Link>

      <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link to="/audiobooks" className="py-2 touch-manipulation">
          Audiobooks
        </Link>
        <Link to="/help" className="py-2 touch-manipulation">
          Ajuda
        </Link>

        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="py-2 touch-manipulation">
              Dashboard
            </Link>
            <Link to="/flashcards" className="py-2 touch-manipulation">
              Flashcards
            </Link>
            {user?.isAdmin && (
              <Link to="/admin" className="py-2 touch-manipulation">
                Admin
              </Link>
            )}
            {user?.plan === 'pro' ? (
              <span className="text-green-700 bg-green-50 rounded px-2 py-1 text-xs font-semibold">
                Vitalício
              </span>
            ) : (
              <Link
                to="/pricing"
                className="text-slate-900 bg-amber-100 rounded px-2 py-1 text-xs font-semibold touch-manipulation"
              >
                Upgrade
              </Link>
            )}
            <span className="text-slate-500">{user?.name || user?.email}</span>
            <SyncStatusIndicator />
            <NotificationCenter />
            <button
              type="button"
              onClick={logout}
              className="text-slate-500 underline py-2 touch-manipulation"
            >
              Sair
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="py-2 touch-manipulation">
              Entrar
            </Link>
            <Link to="/register" className="py-2 touch-manipulation">
              Criar conta
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default Navbar;
