import { useEffect, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { apiRequest } from '../../services/api.js';
import UsFlagIcon from '../features/UsFlagIcon.jsx';

const links = [
  { to: '/audiobooks', label: 'Audiobooks' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/flashcards', label: 'Flashcards' },
];

function Sidebar() {
  // useParams() merges params from every matched route in the branch, so
  // this picks up :id from the nested /audiobooks/:id/player route even
  // though Sidebar itself is rendered by the wrapping Layout route, not
  // that leaf route directly.
  const { id: audiobookId } = useParams();
  const [audiobook, setAudiobook] = useState(null);

  // Render-phase adjustment (not an effect): as soon as the route's :id no
  // longer matches the currently-shown cover - including navigating away
  // from the player entirely - clear it immediately instead of flashing
  // the previous book's cover while the effect below fetches the new one.
  if (audiobook && audiobook.id !== audiobookId) {
    setAudiobook(null);
  }

  useEffect(() => {
    if (!audiobookId) return;

    let cancelled = false;
    apiRequest(`/api/audiobooks/${audiobookId}`)
      .then((data) => {
        if (!cancelled) setAudiobook(data);
      })
      .catch(() => {
        if (!cancelled) setAudiobook(null);
      });

    return () => {
      cancelled = true;
    };
  }, [audiobookId]);

  return (
    <aside className="w-48 shrink-0 border-r border-slate-200 dark:border-stone-700 p-4 hidden sm:block">
      <ul className="flex flex-col gap-2 text-sm">
        {links.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 ${
                  isActive ? 'font-semibold text-primary' : 'text-slate-500 dark:text-stone-400'
                }`
              }
            >
              {link.to === '/audiobooks' && <UsFlagIcon />}
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>

      {audiobook && (
        <div className="mt-8 flex flex-col items-center gap-2 text-center">
          <div className="w-28 h-40 rounded-md overflow-hidden bg-slate-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
            {audiobook.cover_image_url ? (
              <img src={audiobook.cover_image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl text-slate-300 dark:text-stone-600">📖</span>
            )}
          </div>
          <p className="text-xs font-medium text-slate-600 dark:text-stone-300 line-clamp-2">
            {audiobook.title}
          </p>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
