import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';
import { getExperimentAssignment, getVisitorId } from '../../services/experiments.js';

const FEATURES = [
  'Todos os audiobooks, para sempre (25 hoje, crescendo)',
  'Flashcards ilimitados',
  'Tradução ao clicar na palavra, ilimitada',
  'Prática de pronúncia ilimitada',
  'Modo offline (desktop)',
  'Chat com o tutor de IA (10 mensagens/dia)',
];

function PricingPage() {
  const { isAuthenticated, user, accessToken } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Dia 55-56: pricing A/B test (control R$57 vs discount R$47) - falls back
  // to the control price/copy while the assignment call is in flight or if
  // it fails, so the page never blocks on this.
  const [priceVariant, setPriceVariant] = useState(null);

  useEffect(() => {
    getExperimentAssignment('pricing_price')
      .then(setPriceVariant)
      .catch(() => setPriceVariant(null));
  }, []);

  const priceBrlCents = priceVariant?.config?.priceBrlCents ?? 5700;
  const badge = priceVariant?.config?.badge;

  async function handleBuy() {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { url } = await apiRequest('/api/payment/create-checkout-session', {
        method: 'POST',
        token: accessToken,
        body: { subjectId: getVisitorId() },
      });
      window.location.href = url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  const alreadyOwns = user?.plan === 'pro';

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <div>
        <h1 className="text-2xl font-bold">TechSpeak Vitalício</h1>
        <p className="text-slate-500 mt-1">Pagamento único, acesso para sempre.</p>
      </div>

      <div className="rounded-lg border border-slate-200 p-6 flex flex-col gap-4">
        {badge && (
          <span className="bg-amber-100 text-slate-900 text-xs font-semibold rounded px-2 py-1 self-start">
            {badge}
          </span>
        )}
        <p className="text-4xl font-bold">
          R$ {(priceBrlCents / 100).toFixed(0)}{' '}
          <span className="text-base font-normal text-slate-500">pagamento único</span>
        </p>

        <ul className="flex flex-col gap-2 text-sm text-slate-700">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {alreadyOwns ? (
          <p className="text-center bg-green-50 text-green-700 rounded px-4 py-2 font-semibold">
            Você já tem acesso Vitalício ✓
          </p>
        ) : (
          <button
            type="button"
            onClick={handleBuy}
            disabled={loading}
            className="bg-slate-900 text-white rounded px-4 py-3 font-semibold disabled:opacity-50 touch-manipulation"
          >
            {loading ? 'Redirecionando...' : 'Comprar Vitalício'}
          </button>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    </div>
  );
}

export default PricingPage;
