import { Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext.jsx';
import SyncStatusIndicator from '../features/SyncStatusIndicator.jsx';
import NotificationCenter from '../features/NotificationCenter.jsx';
import KeyboardShortcutsHelp from '../features/KeyboardShortcutsHelp.jsx';
import ThemeToggle from '../features/ThemeToggle.jsx';
import RobotLogo from '../features/RobotLogo.jsx';

function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 dark:border-stone-700 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
      <Link
        to="/"
        className="flex items-center gap-1 font-bold text-lg text-blue-600 dark:text-blue-400 neon-text"
      >
        <RobotLogo />
        <span>
          {'TechSpe'}
          <span className="text-white [-webkit-text-stroke:0.6px_rgba(0,0,0,0.6)]">{'ak'}</span>
        </span>
      </Link>

      <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link to="/audiobooks" className="py-2 touch-manipulation">
          Audiobooks
        </Link>
        <Link to="/help" className="py-2 touch-manipulation">
          Ajuda
        </Link>
        <KeyboardShortcutsHelp />
        <ThemeToggle />

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
              <span className="text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-400 rounded px-2 py-1 text-xs font-semibold">
                Vitalício
              </span>
            ) : (
              <Link
                to="/pricing"
                className="text-slate-900 bg-amber-100 dark:bg-amber-300 rounded px-2 py-1 text-xs font-semibold touch-manipulation"
              >
                Upgrade
              </Link>
            )}
            <span className="text-slate-500 dark:text-stone-400">{user?.name || user?.email}</span>
            <SyncStatusIndicator />
            <NotificationCenter />
            <button
              type="button"
              onClick={logout}
              className="text-slate-500 dark:text-stone-400 underline py-2 touch-manipulation"
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
