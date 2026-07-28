import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext.jsx';

// The Stripe redirect can beat the webhook to us, so `user.plan` may still
// read 'free' on the first refreshUser() call - poll a few times before
// giving up and telling the user it just needs a little more time.
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 2000;

function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { user, refreshUser } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function pollForUpgrade() {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const freshUser = await refreshUser().catch(() => null);
        if (cancelled) return;
        if (freshUser?.plan === 'pro') break;
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
      if (!cancelled) setChecking(false);
    }

    pollForUpgrade();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upgraded = user?.plan === 'pro';

  return (
    <div className="flex flex-col gap-4 max-w-md">
      {!sessionId && (
        <p className="text-red-600 dark:text-red-400 text-sm">
          Sessão de pagamento não encontrada.
        </p>
      )}

      {checking && !upgraded && (
        <p className="text-slate-500 dark:text-stone-400">Confirmando seu pagamento...</p>
      )}

      {!checking && upgraded && (
        <>
          <h1 className="text-2xl font-bold text-green-700 dark:text-green-400">
            Pagamento confirmado!
          </h1>
          <p className="text-slate-600 dark:text-stone-300">
            Seu acesso Vitalício ao TechSpeak está ativo. Bons estudos!
          </p>
          <Link to="/dashboard" className="text-slate-900 dark:text-stone-100 underline">
            Ir para o dashboard
          </Link>
        </>
      )}

      {!checking && !upgraded && (
        <>
          <h1 className="text-xl font-bold">Ainda confirmando...</h1>
          <p className="text-slate-600 dark:text-stone-300">
            Recebemos seu pagamento, mas a confirmação está demorando mais que o normal. Isso pode
            levar alguns instantes — recarregue a página em breve ou entre em contato em{' '}
            <a href="mailto:suporte@techspeak.dev" className="underline">
              suporte@techspeak.dev
            </a>
            .
          </p>
        </>
      )}
    </div>
  );
}

export default PaymentSuccessPage;
