import { useEffect, useState } from 'react';
import StatCard from '../features/StatCard.jsx';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

function AdminRevenuePage() {
  const { accessToken } = useAuth();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/api/admin/users', { token: accessToken })
      .then(setUsers)
      .catch((err) => setError(err.message));
  }, [accessToken]);

  if (error) return <p className="text-red-500">{error}</p>;
  if (!users) return <p>Carregando...</p>;

  const byPlan = users.reduce((acc, u) => {
    acc[u.plan] = (acc[u.plan] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Revenue</h1>

      <p className="text-sm text-slate-600 border border-amber-200 bg-amber-50 rounded-lg p-3">
        Cobrança ainda não foi implementada (Stripe está planejado para uma etapa futura) — não
        existe nenhum valor real de receita hoje. Esta página mostra a única informação genuína
        disponível: a distribuição de usuários por plano.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Object.entries(byPlan).map(([plan, count]) => (
          <StatCard key={plan} label={`Plano ${plan}`} value={count} />
        ))}
      </div>
    </div>
  );
}

export default AdminRevenuePage;
