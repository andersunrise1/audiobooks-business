import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';
import { getExperimentAssignment, getVisitorId } from '../../services/experiments.js';

const FEATURES = [
  'Todos os audiobooks, para sempre (25 hoje, crescendo)',
  'Flashcards ilimitados',
  'Tradução ao clicar em qualquer palavra, ilimitada',
  'Modo offline (desktop)',
];

const REFUND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function PricingPage() {
  const { isAuthenticated, user, accessToken, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Dia 55-56: pricing A/B test (control R$57 vs discount R$47) - falls back
  // to the control price/copy while the assignment call is in flight or if
  // it fails, so the page never blocks on this.
  const [priceVariant, setPriceVariant] = useState(null);
  const [confirmingRefund, setConfirmingRefund] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [refunded, setRefunded] = useState(false);
  // Snapshotting "now" via useState's lazy initializer (runs once, on
  // mount) instead of calling Date.now() directly in the render body -
  // React's purity rule flags the latter as an impure call. A few minutes
  // of staleness here is harmless: this only decides whether to show the
  // refund button at all, and the backend re-checks the real window before
  // ever calling Stripe.
  const [nowMs] = useState(() => Date.now());

  useEffect(() => {
    getExperimentAssignment('pricing_price')
      .then(setPriceVariant)
      .catch(() => setPriceVariant(null));
  }, []);

  const priceBrlCents = priceVariant?.config?.priceBrlCents ?? 5700;
  const badge = priceVariant?.config?.badge;

  async function handleBuy() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/pricing' } });
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
  // Client-side mirror of paymentService.isWithinRefundWindow - purely for
  // deciding whether to show the button at all; the backend re-checks this
  // for real before actually calling Stripe, so this half never needs to be
  // perfectly authoritative on its own.
  const withinRefundWindow =
    !refunded &&
    !user?.refundedAt &&
    Boolean(user?.purchasedAt) &&
    nowMs - new Date(user.purchasedAt).getTime() <= REFUND_WINDOW_MS;

  async function handleRefund() {
    setRefunding(true);
    setRefundError('');
    try {
      await apiRequest('/api/payment/refund', { method: 'POST', token: accessToken });
      setRefunded(true);
      setConfirmingRefund(false);
      await refreshUser();
    } catch (err) {
      setRefundError(err.message);
    } finally {
      setRefunding(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <div>
        <h1 className="text-2xl font-bold">TECHSPEAKING Vitalício</h1>
        <p className="text-slate-500 dark:text-stone-400 mt-1">
          Pagamento único, acesso para sempre.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-stone-700 p-6 flex flex-col gap-4">
        {badge && (
          <span className="bg-amber-100 text-slate-900 text-xs font-semibold rounded px-2 py-1 self-start">
            {badge}
          </span>
        )}
        <p className="text-4xl font-bold">
          R$ {(priceBrlCents / 100).toFixed(0)}{' '}
          <span className="text-base font-normal text-slate-500 dark:text-stone-400">
            pagamento único
          </span>
        </p>

        <ul className="flex flex-col gap-2 text-sm text-slate-700 dark:text-stone-200">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {alreadyOwns ? (
          <div className="flex flex-col gap-2">
            <p className="text-center bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 rounded px-4 py-2 font-semibold">
              Você já tem acesso Vitalício ✓
            </p>

            {refunded && (
              <p className="text-center bg-slate-50 dark:bg-stone-800 text-slate-600 dark:text-stone-300 rounded px-4 py-2 text-sm">
                Reembolso confirmado. Seu acesso Vitalício foi encerrado.
              </p>
            )}

            {withinRefundWindow && !confirmingRefund && (
              <button
                type="button"
                onClick={() => setConfirmingRefund(true)}
                className="text-sm text-slate-500 dark:text-stone-400 underline touch-manipulation self-center"
              >
                Solicitar reembolso (dentro do prazo de {`7`} dias)
              </button>
            )}

            {confirmingRefund && (
              <div className="border border-slate-200 dark:border-stone-700 rounded-lg p-3 flex flex-col gap-2">
                <p className="text-sm text-slate-600 dark:text-stone-300">
                  Tem certeza? O reembolso é processado imediatamente e seu acesso Vitalício será
                  encerrado na hora.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRefund}
                    disabled={refunding}
                    className="bg-red-600 text-white rounded px-3 py-2 text-sm font-semibold disabled:opacity-50 touch-manipulation"
                  >
                    {refunding ? 'Processando...' : 'Confirmar reembolso'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingRefund(false)}
                    disabled={refunding}
                    className="bg-slate-100 dark:bg-stone-700 text-slate-700 dark:text-stone-200 rounded px-3 py-2 text-sm font-medium touch-manipulation"
                  >
                    Cancelar
                  </button>
                </div>
                {refundError && (
                  <p className="text-red-600 dark:text-red-400 text-sm">{refundError}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={handleBuy}
            disabled={loading}
            className="bg-primary neon-glow text-white rounded px-4 py-3 font-semibold disabled:opacity-50 touch-manipulation"
          >
            {loading ? 'Redirecionando...' : 'Comprar Vitalício'}
          </button>
        )}

        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
      </div>
    </div>
  );
}

export default PricingPage;
