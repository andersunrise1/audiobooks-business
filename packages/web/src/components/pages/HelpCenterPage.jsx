import { useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

const SUPPORT_EMAIL = 'suporte@techspeaking.dev';

const FAQ = [
  {
    question: 'O que é o TECHSPEAKING Vitalício?',
    answer:
      'É um pagamento único de R$ 57 que dá acesso para sempre a todos os audiobooks do catálogo atual e futuro (sem contar pacotes de novos livros vendidos separadamente), flashcards e tradução ilimitados, e modo offline no app desktop.',
  },
  {
    question: 'Quantos audiobooks estão disponíveis gratuitamente?',
    answer:
      '2 audiobooks completos ficam disponíveis no plano gratuito, sem necessidade de compra: "Daily Standup" e "Remote Work Communication". Os demais fazem parte do Vitalício.',
  },
  {
    question: 'Como funciona a tradução de palavras?',
    answer:
      'Clique em qualquer palavra do texto para ver a tradução, a explicação e um exemplo de uso. Palavras já catalogadas aparecem na hora; palavras novas são traduzidas automaticamente.',
  },
  {
    question: 'O app funciona offline?',
    answer:
      'Sim, no aplicativo desktop: o áudio de cada capítulo é salvo localmente na primeira reprodução, permitindo ouvir novamente sem internet.',
  },
  {
    question: 'Existe reembolso ou cancelamento?',
    answer: `O Vitalício não é uma assinatura recorrente — é um pagamento único, então não há cobrança para "cancelar". Além disso, por se tratar de uma compra feita pela internet, você tem direito de se arrepender e pedir reembolso integral em até 7 dias corridos a partir da compra, garantido pelo Código de Defesa do Consumidor (veja a pergunta abaixo). Para solicitar, entre em contato pelo formulário abaixo ou por ${SUPPORT_EMAIL}.`,
  },
  {
    question: 'Qual a legislação sobre o direito de arrependimento?',
    answer:
      'Art. 49 da Lei nº 8.078/1990 (Código de Defesa do Consumidor): "O consumidor pode desistir do contrato, no prazo de 7 dias a contar de sua assinatura ou do ato de recebimento do produto ou serviço, sempre que a contratação de fornecimento de produtos e serviços ocorrer fora do estabelecimento comercial, especialmente por telefone ou a domicílio." Como a compra do TECHSPEAKING Vitalício é feita pela internet (fora de estabelecimento comercial), esse direito se aplica normalmente.',
  },
  {
    question: 'Como reporto um bug ou problema técnico?',
    answer: `Use o formulário abaixo, descrevendo o que aconteceu, ou envie um e-mail para ${SUPPORT_EMAIL}.`,
  },
];

const INITIAL_FORM = { subject: '', message: '', email: '' };

// Deliberately not shown on the Pricing page or anywhere else in the normal
// navigation - the self-service refund button only appears here, after the
// customer has already gone out of their way to contact support, so it's
// not sitting in front of a paying customer as a constant invitation to
// cancel. It still fully honors the CDC Art. 49 right described in the FAQ
// above - it's just not advertised as a one-click action on every screen.
const REFUND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function HelpCenterPage() {
  const { isAuthenticated, user, accessToken, refreshUser } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [confirmingRefund, setConfirmingRefund] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [refunded, setRefunded] = useState(false);
  // Snapshotting "now" via useState's lazy initializer (runs once, on
  // mount) instead of calling Date.now() directly in the render body -
  // React's purity rule flags the latter as an impure call.
  const [nowMs] = useState(() => Date.now());

  const withinRefundWindow =
    isAuthenticated &&
    user?.plan === 'pro' &&
    !refunded &&
    !user?.refundedAt &&
    Boolean(user?.purchasedAt) &&
    nowMs - new Date(user.purchasedAt).getTime() <= REFUND_WINDOW_MS;

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await apiRequest('/api/support/tickets', {
        method: 'POST',
        token: isAuthenticated ? accessToken : undefined,
        body: isAuthenticated
          ? { subject: form.subject, message: form.message }
          : { subject: form.subject, message: form.message, email: form.email },
      });
      setSubmitted(true);
      setForm(INITIAL_FORM);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

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
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Central de Ajuda</h1>
        <p className="text-slate-500 dark:text-stone-400 mt-1">
          Perguntas frequentes e um jeito direto de falar com a gente.
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Perguntas frequentes</h2>
        <div className="flex flex-col gap-4">
          {FAQ.map((item) => (
            <div key={item.question}>
              <p className="font-semibold">{item.question}</p>
              <p className="text-slate-600 dark:text-stone-300 text-sm">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Falar com o suporte</h2>
        <p className="text-sm text-slate-500 dark:text-stone-400 mb-3">
          Prefere e-mail direto? Escreva para{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>

        {submitted ? (
          <div className="flex flex-col gap-2">
            <p className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 rounded px-4 py-3 text-sm">
              Mensagem enviada! Vamos responder o quanto antes.
            </p>

            {refunded && (
              <p className="bg-slate-50 dark:bg-stone-800 text-slate-600 dark:text-stone-300 rounded px-4 py-3 text-sm">
                Reembolso confirmado. Seu acesso Vitalício foi encerrado.
              </p>
            )}

            {withinRefundWindow && !confirmingRefund && (
              <button
                type="button"
                onClick={() => setConfirmingRefund(true)}
                className="text-sm text-slate-500 dark:text-stone-400 underline touch-manipulation self-start"
              >
                Solicitar reembolso (dentro do prazo de 7 dias)
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
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {!isAuthenticated && (
              <input
                required
                type="email"
                aria-label="Seu e-mail"
                placeholder="Seu e-mail"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="border border-slate-300 rounded px-3 py-2"
              />
            )}
            <input
              required
              aria-label="Assunto"
              placeholder="Assunto"
              value={form.subject}
              onChange={(e) => updateField('subject', e.target.value)}
              className="border border-slate-300 rounded px-3 py-2"
            />
            <textarea
              required
              aria-label="Descreva sua dúvida ou problema"
              placeholder="Descreva sua dúvida ou problema"
              value={form.message}
              onChange={(e) => updateField('message', e.target.value)}
              className="border border-slate-300 rounded px-3 py-2"
              rows={4}
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary neon-glow text-white rounded px-4 py-2 font-semibold disabled:opacity-50 touch-manipulation self-start"
            >
              {submitting ? 'Enviando...' : 'Enviar'}
            </button>
            {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
          </form>
        )}
      </section>
    </div>
  );
}

export default HelpCenterPage;
