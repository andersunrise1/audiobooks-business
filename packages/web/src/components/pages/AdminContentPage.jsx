import { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

function statusFor(book) {
  if (!book.published_at) return { label: 'Rascunho', className: 'bg-slate-200 text-slate-700' };

  const publishedAt = new Date(book.published_at);
  if (publishedAt > new Date()) {
    return {
      label: `Agendado para ${publishedAt.toLocaleString('pt-BR')}`,
      className: 'bg-amber-100 text-slate-900',
    };
  }

  return {
    label: `Publicado em ${publishedAt.toLocaleString('pt-BR')}`,
    className: 'bg-green-100 text-green-800',
  };
}

function AdminContentPage() {
  const { accessToken } = useAuth();
  const [books, setBooks] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewId, setPreviewId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scheduleInputs, setScheduleInputs] = useState({});
  const [actionError, setActionError] = useState('');

  function loadBooks() {
    apiRequest('/api/admin/audiobooks', { token: accessToken })
      .then(setBooks)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadBooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function togglePreview(id) {
    if (previewId === id) {
      setPreviewId(null);
      setPreview(null);
      return;
    }

    setPreviewId(id);
    setPreview(null);
    try {
      const data = await apiRequest(`/api/admin/audiobooks/${id}`, { token: accessToken });
      setPreview(data);
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function publishNow(id) {
    setActionError('');
    try {
      await apiRequest(`/api/admin/audiobooks/${id}/publish`, {
        method: 'POST',
        token: accessToken,
      });
      loadBooks();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function schedule(id) {
    const value = scheduleInputs[id];
    if (!value) return;

    setActionError('');
    try {
      await apiRequest(`/api/admin/audiobooks/${id}/publish`, {
        method: 'POST',
        token: accessToken,
        body: { publishedAt: new Date(value).toISOString() },
      });
      loadBooks();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function unpublish(id) {
    setActionError('');
    try {
      await apiRequest(`/api/admin/audiobooks/${id}/unpublish`, {
        method: 'POST',
        token: accessToken,
      });
      loadBooks();
    } catch (err) {
      setActionError(err.message);
    }
  }

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Conteúdo</h1>
      <p className="text-sm text-slate-500">
        Gerencie o status de publicação dos audiobooks — rascunhos e agendamentos não aparecem no
        catálogo público.
      </p>

      {actionError && <p className="text-red-500 text-sm">{actionError}</p>}

      <ul className="flex flex-col gap-3">
        {books.map((book) => {
          const status = statusFor(book);
          return (
            <li
              key={book.id}
              className="border border-slate-200 dark:border-stone-700 rounded p-3 flex flex-col gap-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold">{book.title}</span>
                  {book.level && <span className="text-slate-500 text-sm"> — {book.level}</span>}
                </div>
                <span className={`text-xs font-semibold rounded px-2 py-1 ${status.className}`}>
                  {status.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => togglePreview(book.id)}
                  className="text-sm underline touch-manipulation"
                >
                  {previewId === book.id ? 'Fechar preview' : 'Preview'}
                </button>
                <button
                  type="button"
                  onClick={() => publishNow(book.id)}
                  className="text-sm bg-primary neon-glow text-white rounded px-3 py-1 touch-manipulation"
                >
                  Publicar agora
                </button>
                <input
                  type="datetime-local"
                  value={scheduleInputs[book.id] ?? ''}
                  onChange={(e) =>
                    setScheduleInputs((prev) => ({ ...prev, [book.id]: e.target.value }))
                  }
                  className="border border-slate-300 rounded px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => schedule(book.id)}
                  className="text-sm bg-slate-100 dark:bg-stone-700 rounded px-3 py-1 touch-manipulation"
                >
                  Agendar
                </button>
                {book.published_at && (
                  <button
                    type="button"
                    onClick={() => unpublish(book.id)}
                    className="text-sm text-red-600 underline touch-manipulation"
                  >
                    Despublicar
                  </button>
                )}
              </div>

              {previewId === book.id && (
                <div className="bg-slate-50 dark:bg-stone-800 rounded p-3 text-sm flex flex-col gap-2">
                  {!preview ? (
                    <p className="text-slate-500">Carregando preview...</p>
                  ) : (
                    preview.chapters.map((chapter) => (
                      <div key={chapter.id}>
                        <p className="font-semibold">
                          Capítulo {chapter.order_index}: {chapter.title}
                        </p>
                        <p className="text-slate-600">{chapter.transcript || '(sem transcript)'}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default AdminContentPage;
