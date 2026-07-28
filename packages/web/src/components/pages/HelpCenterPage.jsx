import { useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

const SUPPORT_EMAIL = 'suporte@techspeak.dev';

const FAQ = [
  {
    question: 'O que é o TechSpeak Vitalício?',
    answer:
      'É um pagamento único de R$ 57 que dá acesso para sempre a todos os audiobooks do catálogo atual e futuro (sem contar pacotes de novos livros vendidos separadamente), flashcards e tradução ilimitados, prática de pronúncia e modo offline no app desktop.',
  },
  {
    question: 'Quantos audiobooks estão disponíveis gratuitamente?',
    answer:
      '2 audiobooks completos ficam disponíveis no plano gratuito, sem necessidade de compra: "Daily Standup" e "Remote Work Communication". Os demais fazem parte do Vitalício.',
  },
  {
    question: 'Como funciona o tutor de IA?',
    answer:
      'O chat com o tutor de IA tem um limite diário de mensagens (1/dia no plano gratuito, 10/dia no Vitalício) — esse limite existe mesmo para quem já comprou, já que cada mensagem tem um custo real de processamento.',
  },
  {
    question: 'O app funciona offline?',
    answer:
      'Sim, no aplicativo desktop: o áudio de cada capítulo é salvo localmente na primeira reprodução, permitindo ouvir novamente sem internet.',
  },
  {
    question: 'Existe reembolso ou cancelamento?',
    answer: `O Vitalício não é uma assinatura recorrente — é um pagamento único, então não há cobrança para "cancelar". Para dúvidas sobre reembolso de uma compra específica, entre em contato pelo formulário abaixo ou por ${SUPPORT_EMAIL}.`,
  },
  {
    question: 'Como reporto um bug ou problema técnico?',
    answer: `Use o formulário abaixo, descrevendo o que aconteceu, ou envie um e-mail para ${SUPPORT_EMAIL}.`,
  },
];

const INITIAL_FORM = { subject: '', message: '', email: '' };

function HelpCenterPage() {
  const { isAuthenticated, accessToken } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

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

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Central de Ajuda</h1>
        <p className="text-slate-500 mt-1">
          Perguntas frequentes e um jeito direto de falar com a gente.
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Perguntas frequentes</h2>
        <div className="flex flex-col gap-4">
          {FAQ.map((item) => (
            <div key={item.question}>
              <p className="font-semibold">{item.question}</p>
              <p className="text-slate-600 text-sm">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Falar com o suporte</h2>
        <p className="text-sm text-slate-500 mb-3">
          Prefere e-mail direto? Escreva para{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>

        {submitted ? (
          <p className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 rounded px-4 py-3 text-sm">
            Mensagem enviada! Vamos responder o quanto antes.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {!isAuthenticated && (
              <input
                required
                type="email"
                placeholder="Seu e-mail"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="border border-slate-300 rounded px-3 py-2"
              />
            )}
            <input
              required
              placeholder="Assunto"
              value={form.subject}
              onChange={(e) => updateField('subject', e.target.value)}
              className="border border-slate-300 rounded px-3 py-2"
            />
            <textarea
              required
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
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </form>
        )}
      </section>
    </div>
  );
}

export default HelpCenterPage;
