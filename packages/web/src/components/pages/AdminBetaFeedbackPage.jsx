import { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

const CATEGORY_LABEL = { bug: 'Bug', feature_request: 'Sugestão', general: 'Geral' };
const CATEGORY_CLASS = {
  bug: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400',
  feature_request: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400',
  general: 'bg-slate-100 text-slate-800 dark:bg-stone-700 dark:text-stone-200',
};

function AdminBetaFeedbackPage() {
  const { accessToken } = useAuth();
  const [feedback, setFeedback] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/api/admin/beta-feedback', { token: accessToken })
      .then(setFeedback)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Feedback do Beta</h1>
      <p className="text-sm text-slate-500 dark:text-stone-400">
        Enviado por qualquer usuário autenticado via a página Feedback; marcado como beta tester no
        momento do envio, quando aplicável.
      </p>

      {feedback.length === 0 ? (
        <p className="text-slate-500 dark:text-stone-400">Nenhum feedback registrado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {feedback.map((item) => (
            <li
              key={item.id}
              className="border border-slate-200 dark:border-stone-700 rounded p-3 flex flex-col gap-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold">{item.user.name || item.user.email}</span>
                  <span className="text-slate-500 dark:text-stone-400 text-sm">
                    {' '}
                    — {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                    {item.wasBetaTester && ' · beta tester'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {item.rating && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      {'★'.repeat(item.rating)}
                      {'☆'.repeat(5 - item.rating)}
                    </span>
                  )}
                  <span
                    className={`text-xs font-semibold rounded px-2 py-1 ${CATEGORY_CLASS[item.category]}`}
                  >
                    {CATEGORY_LABEL[item.category]}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-stone-300">{item.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AdminBetaFeedbackPage;
