import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

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
  if (error) return <p className="text-red-500">{error}</p>;

  const filteredAudiobooks = audiobooks.filter((book) =>
    book.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Audiobooks</h1>

      <input
        ref={searchInputRef}
        type="search"
        placeholder="Buscar audiobook..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border border-slate-300 rounded px-3 py-2 mb-4 w-full max-w-sm"
      />

      {filteredAudiobooks.length === 0 ? (
        <p className="text-slate-500">
          {audiobooks.length === 0
            ? 'Nenhum audiobook cadastrado ainda.'
            : 'Nenhum audiobook encontrado.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filteredAudiobooks.map((book) => (
            <li key={book.id} className="flex items-center gap-2">
              <Link to={`/audiobooks/${book.id}/player`} className="underline">
                {book.title}
              </Link>
              {book.level && <span className="text-slate-500 text-sm">— {book.level}</span>}
              {!book.is_free && !isPro && (
                <span
                  className="text-amber-600 dark:text-amber-400"
                  role="img"
                  aria-label="Exclusivo do TechSpeak Vitalício"
                  title="Exclusivo do TechSpeak Vitalício"
                >
                  🔒
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AudiobookListPage;
