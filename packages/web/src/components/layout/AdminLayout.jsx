import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: '/admin/upload', label: 'Upload Audiobooks' },
  { to: '/admin/content', label: 'Conteúdo' },
  { to: '/admin/analytics', label: 'Analytics' },
  { to: '/admin/metrics', label: 'Métricas' },
  { to: '/admin/experiments', label: 'Experimentos' },
  { to: '/admin/support', label: 'Suporte' },
  { to: '/admin/users', label: 'Usuários' },
  { to: '/admin/revenue', label: 'Revenue' },
];

function AdminLayout() {
  return (
    <div className="flex flex-col gap-6">
      <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `px-3 py-2 rounded text-sm touch-manipulation ${
                isActive ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}

export default AdminLayout;
