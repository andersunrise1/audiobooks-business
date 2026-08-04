import { Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext.jsx';
import SyncStatusIndicator from '../features/SyncStatusIndicator.jsx';
import NotificationCenter from '../features/NotificationCenter.jsx';
import KeyboardShortcutsHelp from '../features/KeyboardShortcutsHelp.jsx';
import ThemeToggle from '../features/ThemeToggle.jsx';
import ThemeSettings from '../features/ThemeSettings.jsx';
import TechSpeakWordmark from '../features/TechSpeakWordmark.jsx';
import UsFlagIcon from '../features/UsFlagIcon.jsx';

function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    // The `dark` class forces this subtree into dark mode regardless of the
    // reader's actual light/dark/system choice (ThemeContext toggles `dark`
    // on <html>, not here) - the navbar itself always stays black per the
    // user's request, while every other page still follows the real theme
    // toggle normally. Tailwind's `@custom-variant dark` matches `.dark *`,
    // so every descendant's existing `dark:` utility (badges, wordmark,
    // ThemeToggle/ThemeSettings popovers, etc.) resolves correctly without
    // needing its own change.
    <header className="dark bg-black text-stone-100 border-b border-slate-200 dark:border-stone-700 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
      <Link to="/">
        <TechSpeakWordmark className="text-lg" />
      </Link>

      <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link to="/audiobooks" className="py-2 touch-manipulation inline-flex items-center gap-1.5">
          <UsFlagIcon />
          Audiobooks
        </Link>
        <Link to="/help" className="py-2 touch-manipulation">
          Ajuda
        </Link>
        <KeyboardShortcutsHelp />
        <ThemeToggle />
        <ThemeSettings />

        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="py-2 touch-manipulation">
              Dashboard
            </Link>
            <Link to="/flashcards" className="py-2 touch-manipulation">
              Flashcards
            </Link>
            <Link to="/feedback" className="py-2 touch-manipulation">
              Feedback
            </Link>
            {user?.isAdmin && (
              <Link to="/admin" className="py-2 touch-manipulation">
                Admin
              </Link>
            )}
            {user?.isBetaTester && (
              <span className="text-purple-700 bg-purple-50 dark:bg-purple-950 dark:text-purple-400 rounded px-2 py-1 text-xs font-semibold">
                Beta Tester
              </span>
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
