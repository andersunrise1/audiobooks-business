import { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

function AdminSupportPage() {
  const { accessToken } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [responses, setResponses] = useState({});
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [loading, setLoading] = useState(true);

  function loadTickets() {
    apiRequest('/api/admin/support/tickets', { token: accessToken })
      .then(setTickets)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function resolveTicket(id) {
    setActionError('');
    try {
      await apiRequest(`/api/admin/support/tickets/${id}`, {
        method: 'PATCH',
        token: accessToken,
        body: { status: 'resolved', adminResponse: responses[id] },
      });
      loadTickets();
    } catch (err) {
      setActionError(err.message);
    }
  }

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Suporte</h1>
      <p className="text-sm text-slate-500">
        Sem envio automático de e-mail nesta versão — a resposta fica registrada aqui; entre em
        contato manualmente com o solicitante enquanto isso não existe.
      </p>

      {actionError && <p className="text-red-500 text-sm">{actionError}</p>}

      {tickets.length === 0 ? (
        <p className="text-slate-500">Nenhum ticket registrado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {tickets.map((ticket) => (
            <li
              key={ticket.id}
              className="border border-slate-200 dark:border-stone-700 rounded p-3 flex flex-col gap-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold">{ticket.subject}</span>
                  <span className="text-slate-500 text-sm"> — {ticket.email}</span>
                </div>
                <span
                  className={`text-xs font-semibold rounded px-2 py-1 ${
                    ticket.status === 'resolved'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-slate-900'
                  }`}
                >
                  {ticket.status === 'resolved' ? 'Resolvido' : 'Aberto'}
                </span>
              </div>

              <p className="text-sm text-slate-600">{ticket.message}</p>

              {ticket.adminResponse && (
                <p className="text-sm bg-slate-50 dark:bg-stone-800 rounded p-2">
                  <span className="font-semibold">Resposta: </span>
                  {ticket.adminResponse}
                </p>
              )}

              {ticket.status !== 'resolved' && (
                <div className="flex flex-col gap-2">
                  <textarea
                    placeholder="Resposta (opcional)"
                    value={responses[ticket.id] ?? ''}
                    onChange={(e) =>
                      setResponses((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                    }
                    className="border border-slate-300 rounded px-3 py-2 text-sm"
                    rows={2}
                  />
                  <button
                    type="button"
                    onClick={() => resolveTicket(ticket.id)}
                    className="text-sm bg-blue-600 dark:bg-blue-500 neon-glow text-white rounded px-3 py-1 self-start touch-manipulation"
                  >
                    Marcar como resolvido
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AdminSupportPage;
