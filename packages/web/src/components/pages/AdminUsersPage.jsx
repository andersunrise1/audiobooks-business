import { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

function fetchUsers(accessToken) {
  return apiRequest('/api/admin/users', { token: accessToken });
}

function AdminUsersPage() {
  const { accessToken, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState(null);

  useEffect(() => {
    fetchUsers(accessToken)
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken]);

  async function toggleAdmin(targetUser) {
    setError('');
    setPendingId(targetUser.id);
    try {
      await apiRequest(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        token: accessToken,
        body: { isAdmin: !targetUser.isAdmin },
      });
      setUsers(await fetchUsers(accessToken));
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingId(null);
    }
  }

  async function toggleBetaTester(targetUser) {
    setError('');
    setPendingId(targetUser.id);
    try {
      await apiRequest(`/api/admin/users/${targetUser.id}/beta-tester`, {
        method: 'PATCH',
        token: accessToken,
        body: { isBetaTester: !targetUser.isBetaTester },
      });
      setUsers(await fetchUsers(accessToken));
    } catch (err) {
      setError(err.message);
    } finally {
      setPendingId(null);
    }
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Usuários</h1>
      {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-slate-200 dark:border-stone-700 rounded-lg overflow-hidden">
          <thead className="bg-slate-50 dark:bg-stone-800 text-left">
            <tr>
              <th className="p-2">Email</th>
              <th className="p-2">Nome</th>
              <th className="p-2">Plano</th>
              <th className="p-2">Admin</th>
              <th className="p-2">Beta</th>
              <th className="p-2">Criado em</th>
              <th className="p-2"></th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 dark:border-stone-700">
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.name || '—'}</td>
                <td className="p-2">{u.plan}</td>
                <td className="p-2">{u.isAdmin ? 'Sim' : 'Não'}</td>
                <td className="p-2">{u.isBetaTester ? 'Sim' : 'Não'}</td>
                <td className="p-2">{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
                <td className="p-2">
                  <button
                    type="button"
                    disabled={pendingId === u.id || u.id === currentUser?.id}
                    onClick={() => toggleAdmin(u)}
                    className="text-xs underline disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
                  >
                    {u.isAdmin ? 'Remover admin' : 'Tornar admin'}
                  </button>
                </td>
                <td className="p-2">
                  <button
                    type="button"
                    disabled={pendingId === u.id}
                    onClick={() => toggleBetaTester(u)}
                    className="text-xs underline disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
                  >
                    {u.isBetaTester ? 'Remover beta' : 'Tornar beta (Pro grátis)'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminUsersPage;
