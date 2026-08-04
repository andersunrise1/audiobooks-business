import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';
import UsFlagIcon from '../features/UsFlagIcon.jsx';

function AudiobookListPage() {
  const { user } = useAuth();
  const location = useLocation();
  const isPro = user?.plan === 'pro';
  const [audiobooks, setAudiobooks] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const searchInputRef = useRef(null);

  useEffect(() => {
    apiRequest('/api/audiobooks')
      .then(setAudiobooks)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Dia 65: Cmd/Ctrl+K (desktop only) lands here and focuses this input -
  // see useKeyboardShortcuts.js.
  useEffect(() => {
    if (location.state?.focusSearch) searchInputRef.current?.focus();
  }, [location.state]);

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;

  const filteredAudiobooks = audiobooks.filter((book) =>
    book.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <UsFlagIcon className="w-7 h-5" />
        Audiobooks
      </h1>

      <input
        ref={searchInputRef}
        type="search"
        aria-label="Buscar audiobook"
        placeholder="Buscar audiobook..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border border-slate-300 rounded px-3 py-2 mb-4 w-full max-w-sm"
      />

      {filteredAudiobooks.length === 0 ? (
        <p className="text-slate-500 dark:text-stone-400">
          {audiobooks.length === 0
            ? 'Nenhum audiobook cadastrado ainda.'
            : 'Nenhum audiobook encontrado.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filteredAudiobooks.map((book) => (
            <li key={book.id}>
              <Link
                to={`/audiobooks/${book.id}/player`}
                className="flex gap-4 rounded-lg border border-slate-200 dark:border-stone-700 p-3 hover:bg-slate-50 dark:hover:bg-stone-800 touch-manipulation"
              >
                <div className="w-20 h-28 shrink-0 rounded-md overflow-hidden bg-slate-100 dark:bg-stone-800 flex items-center justify-center">
                  {book.cover_image_url ? (
                    <img src={book.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl text-slate-300 dark:text-stone-600">📖</span>
                  )}
                </div>

                <div className="flex flex-col gap-1 min-w-0 py-1">
                  {book.category && (
                    <span className="text-xs font-medium text-primary bg-slate-100 dark:bg-stone-800 rounded px-2 py-0.5 self-start">
                      {book.category}
                    </span>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{book.title}</span>
                    {!book.is_free && !isPro && (
                      <span
                        className="text-amber-600 dark:text-amber-400"
                        role="img"
                        aria-label="Exclusivo do TECHSPEAKING Vitalício"
                        title="Exclusivo do TECHSPEAKING Vitalício"
                      >
                        🔒
                      </span>
                    )}
                  </div>

                  {book.description && (
                    <p className="text-sm text-slate-500 dark:text-stone-400 line-clamp-2">
                      {book.description}
                    </p>
                  )}

                  <div className="flex gap-3 text-xs text-slate-400 dark:text-stone-500 mt-1">
                    {book.duration_minutes && <span>⏱ {book.duration_minutes} min</span>}
                    {book.level && <span>🎓 {book.level}</span>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AudiobookListPage;
