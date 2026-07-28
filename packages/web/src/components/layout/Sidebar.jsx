import { NavLink } from 'react-router-dom';

const links = [
  { to: '/audiobooks', label: 'Audiobooks' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/flashcards', label: 'Flashcards' },
];

function Sidebar() {
  return (
    <aside className="w-48 shrink-0 border-r border-slate-200 dark:border-stone-700 p-4 hidden sm:block">
      <ul className="flex flex-col gap-2 text-sm">
        {links.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              className={({ isActive }) =>
                isActive ? 'font-semibold text-primary' : 'text-slate-500 dark:text-stone-400'
              }
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default Sidebar;
