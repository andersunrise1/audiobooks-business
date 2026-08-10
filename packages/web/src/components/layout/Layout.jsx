import { Link, Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts.js';

// Only reachable place for /privacy and /terms outside typing the URL
// directly - Google Play's store listing requires a public privacy policy
// URL, so this footer is what makes that requirement real rather than a
// page nobody can find.
function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-stone-700 px-4 sm:px-6 py-4 text-xs text-slate-500 dark:text-stone-400 flex flex-wrap gap-x-4 gap-y-1">
      <Link to="/privacy" className="underline touch-manipulation">
        Política de Privacidade
      </Link>
      <Link to="/terms" className="underline touch-manipulation">
        Termos de Uso
      </Link>
      <Link to="/help" className="underline touch-manipulation">
        Ajuda
      </Link>
    </footer>
  );
}

function Layout() {
  useKeyboardShortcuts();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Dia 70: lets a keyboard user skip the repeated Navbar/Sidebar
          links and jump straight to page content - invisible until it
          receives focus (first Tab press). */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-white focus:rounded focus:px-4 focus:py-2"
      >
        Pular para o conteúdo
      </a>
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 min-w-0">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default Layout;
