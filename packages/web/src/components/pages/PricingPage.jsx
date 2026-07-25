import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

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
        <p className="text-4xl font-bold">
          R$ 57 <span className="text-base font-normal text-slate-500">pagamento único</span>
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
