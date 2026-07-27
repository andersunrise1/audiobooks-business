import { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

function formatPercent(value) {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`;
}

function AdminExperimentsPage() {
  const { accessToken } = useAuth();
  const [experiments, setExperiments] = useState([]);
  const [results, setResults] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/api/admin/experiments', { token: accessToken })
      .then(async (list) => {
        setExperiments(list);
        const entries = await Promise.all(
          list.map((experiment) =>
            apiRequest(`/api/admin/experiments/${experiment.name}/results`, {
              token: accessToken,
            }).then((data) => [experiment.name, data.results]),
          ),
        );
        setResults(Object.fromEntries(entries));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Experimentos (A/B)</h1>
      <p className="text-sm text-slate-500">
        Nenhuma variante afeta usuários com conta Vitalício já ativa — os testes atuam apenas antes
        da compra (preço) ou no aviso do paywall.
      </p>

      {experiments.map((experiment) => (
        <section key={experiment.name}>
          <h2 className="text-lg font-semibold mb-2">{experiment.name}</h2>
          <table className="w-full text-sm border border-slate-200 dark:border-stone-700 rounded-lg overflow-hidden">
            <thead className="bg-slate-50 dark:bg-stone-800 text-left">
              <tr>
                <th className="p-2">Variante</th>
                <th className="p-2">Exposições</th>
                <th className="p-2">Conversões</th>
                <th className="p-2">Taxa</th>
              </tr>
            </thead>
            <tbody>
              {(results[experiment.name] ?? []).map((row) => (
                <tr key={row.variant} className="border-t border-slate-100 dark:border-stone-700">
                  <td className="p-2">{row.variant}</td>
                  <td className="p-2">{row.exposures}</td>
                  <td className="p-2">{row.conversions}</td>
                  <td className="p-2">{formatPercent(row.conversionRate)}</td>
                </tr>
              ))}
              {(results[experiment.name] ?? []).length === 0 && (
                <tr>
                  <td className="p-2 text-slate-400" colSpan={4}>
                    Nenhuma exposição registrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

export default AdminExperimentsPage;
