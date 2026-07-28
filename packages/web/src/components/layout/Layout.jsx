import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts.js';

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
    </div>
  );
}

export default Layout;
