import { useEffect, useState } from 'react';
import StatCard from '../features/StatCard.jsx';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

function formatPercent(value) {
  return value === null ? '—' : `${Math.round(value * 100)}%`;
}

function formatBrl(cents) {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

function AdminMetricsPage() {
  const { accessToken } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/api/admin/content-analytics', { token: accessToken })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!data) return null;

  const { completionRates, retention, lifetimeValue } = data;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Métricas de Negócio</h1>
      <p className="text-sm text-slate-500">
        TechSpeak não tem assinatura recorrente (compra vitalícia única), então &quot;churn&quot;
        aqui mede inatividade de uso, não cancelamento — e o LTV é simplesmente o preço vitalício
        vezes a taxa de conversão, sem fórmula de receita recorrente.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Conversão para Vitalício"
          value={formatPercent(lifetimeValue.conversionRate)}
          hint={`${lifetimeValue.payingUsers} de ${lifetimeValue.totalUsers} usuários`}
        />
        <StatCard label="Receita total" value={formatBrl(lifetimeValue.totalRevenueBrlCents)} />
        <StatCard
          label="LTV médio por usuário"
          value={formatBrl(lifetimeValue.averageLtvBrlCents)}
        />
        <StatCard
          label="Churn de atividade (30d)"
          value={formatPercent(retention.churnRate)}
          hint={`${retention.retainedUsers} de ${retention.previousPeriodActiveUsers} retidos`}
        />
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-2">Taxa de conclusão por audiobook</h2>
        <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-2">Audiobook</th>
              <th className="p-2">Iniciaram</th>
              <th className="p-2">Concluíram</th>
              <th className="p-2">Taxa</th>
            </tr>
          </thead>
          <tbody>
            {completionRates.map((row) => (
              <tr key={row.audiobookId} className="border-t border-slate-100">
                <td className="p-2">{row.title}</td>
                <td className="p-2">{row.usersStarted}</td>
                <td className="p-2">{row.usersCompleted}</td>
                <td className="p-2">{formatPercent(row.completionRate)}</td>
              </tr>
            ))}
            {completionRates.length === 0 && (
              <tr>
                <td className="p-2 text-slate-400" colSpan={4}>
                  Nenhum audiobook cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default AdminMetricsPage;
