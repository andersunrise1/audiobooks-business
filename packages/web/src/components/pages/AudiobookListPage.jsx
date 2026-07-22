import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../services/api.js';

function AudiobookListPage() {
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
            <li key={book.id}>
              <Link to={`/audiobooks/${book.id}/player`} className="underline">
                {book.title}
              </Link>
              {book.level && <span className="text-slate-500 text-sm"> — {book.level}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AudiobookListPage;
