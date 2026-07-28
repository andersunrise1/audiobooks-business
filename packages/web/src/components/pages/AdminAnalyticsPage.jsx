import { useEffect, useState } from 'react';
import StatCard from '../features/StatCard.jsx';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

function formatUsd(value) {
  return `$${Number(value).toFixed(4)}`;
}

function AdminAnalyticsPage() {
  const { accessToken } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/api/admin/analytics', { token: accessToken })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;
  if (!data) return null;

  const totalCostUsd = data.costPerUser.reduce((sum, row) => sum + row.totalCostUsd, 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Analytics de IA</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Satisfação"
          value={
            data.satisfaction.satisfactionRate === null
              ? '—'
              : `${Math.round(data.satisfaction.satisfactionRate * 100)}%`
          }
          hint={`${data.satisfaction.helpfulCount} 👍 · ${data.satisfaction.notHelpfulCount} 👎`}
        />
        <StatCard label="Custo total estimado" value={formatUsd(totalCostUsd)} />
        <StatCard label="Usuários com uso de IA" value={data.costPerUser.length} />
        <StatCard label="Capítulos com perguntas" value={data.questionsPerChapter.length} />
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-2">Perguntas por capítulo</h2>
        <table className="w-full text-sm border border-slate-200 dark:border-stone-700 rounded-lg overflow-hidden">
          <thead className="bg-slate-50 dark:bg-stone-800 text-left">
            <tr>
              <th className="p-2">Capítulo</th>
              <th className="p-2">Perguntas</th>
            </tr>
          </thead>
          <tbody>
            {data.questionsPerChapter.map((row) => (
              <tr key={row.chapterId} className="border-t border-slate-100 dark:border-stone-700">
                <td className="p-2">{row.title}</td>
                <td className="p-2">{row.questionCount}</td>
              </tr>
            ))}
            {data.questionsPerChapter.length === 0 && (
              <tr>
                <td className="p-2 text-slate-500 dark:text-stone-400" colSpan={2}>
                  Nenhuma pergunta registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Tempo de resposta médio</h2>
        <table className="w-full text-sm border border-slate-200 dark:border-stone-700 rounded-lg overflow-hidden">
          <thead className="bg-slate-50 dark:bg-stone-800 text-left">
            <tr>
              <th className="p-2">Endpoint</th>
              <th className="p-2">Tempo médio</th>
              <th className="p-2">Chamadas</th>
            </tr>
          </thead>
          <tbody>
            {data.avgResponseTime.map((row) => (
              <tr key={row.endpoint} className="border-t border-slate-100 dark:border-stone-700">
                <td className="p-2">{row.endpoint}</td>
                <td className="p-2">{row.avgResponseTimeMs} ms</td>
                <td className="p-2">{row.callCount}</td>
              </tr>
            ))}
            {data.avgResponseTime.length === 0 && (
              <tr>
                <td className="p-2 text-slate-500 dark:text-stone-400" colSpan={3}>
                  Nenhuma chamada de IA registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Custo por usuário</h2>
        <table className="w-full text-sm border border-slate-200 dark:border-stone-700 rounded-lg overflow-hidden">
          <thead className="bg-slate-50 dark:bg-stone-800 text-left">
            <tr>
              <th className="p-2">Usuário</th>
              <th className="p-2">Custo estimado</th>
              <th className="p-2">Requisições</th>
            </tr>
          </thead>
          <tbody>
            {data.costPerUser.map((row) => (
              <tr key={row.userId} className="border-t border-slate-100 dark:border-stone-700">
                <td className="p-2">{row.email}</td>
                <td className="p-2">{formatUsd(row.totalCostUsd)}</td>
                <td className="p-2">{row.requestCount}</td>
              </tr>
            ))}
            {data.costPerUser.length === 0 && (
              <tr>
                <td className="p-2 text-slate-500 dark:text-stone-400" colSpan={3}>
                  Nenhum uso de IA registrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default AdminAnalyticsPage;
