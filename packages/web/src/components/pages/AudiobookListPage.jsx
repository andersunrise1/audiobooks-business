import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

function AudiobookListPage() {
  const { user } = useAuth();
  const isPro = user?.plan === 'pro';
  const [audiobooks, setAudiobooks] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/api/audiobooks')
      .then(setAudiobooks)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Audiobooks</h1>

      {audiobooks.length === 0 ? (
        <p className="text-slate-500">Nenhum audiobook cadastrado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {audiobooks.map((book) => (
            <li key={book.id} className="flex items-center gap-2">
              <Link to={`/audiobooks/${book.id}/player`} className="underline">
                {book.title}
              </Link>
              {book.level && <span className="text-slate-500 text-sm">— {book.level}</span>}
              {!book.is_free && !isPro && (
                <span className="bg-amber-100 text-slate-900 text-xs font-semibold rounded px-2 py-0.5">
                  Vitalício
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
