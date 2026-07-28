import { useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

const CATEGORIES = [
  { value: 'bug', label: 'Encontrei um problema' },
  { value: 'feature_request', label: 'Sugestão de melhoria' },
  { value: 'general', label: 'Comentário geral' },
];

const INITIAL_FORM = { category: 'general', rating: null, message: '' };

// Dia 76-77: distinct from HelpCenterPage's support-ticket form (Dia
// 57-58) - this is open-ended product feedback (bug reports, feature
// requests, a quick satisfaction rating), not a specific help request
// expecting a reply. Open to any authenticated user, not gated to current
// beta testers - the backend snapshots is_beta_tester per submission so
// beta feedback can still be told apart later.
function FeedbackPage() {
  const { accessToken } = useAuth();
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
      await apiRequest('/api/beta/feedback', {
        method: 'POST',
        token: accessToken,
        body: { category: form.category, rating: form.rating, message: form.message },
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
    <div className="flex flex-col gap-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Feedback</h1>
        <p className="text-slate-500 dark:text-stone-400 mt-1">
          Conta pra gente o que está funcionando, o que não está, ou o que você gostaria de ver no
          TechSpeak.
        </p>
      </div>

      {submitted ? (
        <p className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 rounded px-4 py-3 text-sm">
          Feedback enviado, obrigado!
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="feedback-category" className="text-sm font-semibold">
              Tipo
            </label>
            <select
              id="feedback-category"
              value={form.category}
              onChange={(e) => updateField('category', e.target.value)}
              className="border border-slate-300 rounded px-3 py-2"
            >
              {CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold">Nota geral (opcional)</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`${value} de 5`}
                  aria-pressed={form.rating === value}
                  onClick={() => updateField('rating', form.rating === value ? null : value)}
                  className={`w-9 h-9 rounded touch-manipulation ${
                    form.rating && value <= form.rating
                      ? 'bg-primary neon-glow text-white'
                      : 'bg-slate-100 dark:bg-stone-700'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <textarea
            required
            aria-label="Sua mensagem"
            placeholder="Descreva o que aconteceu ou o que você gostaria de sugerir"
            value={form.message}
            onChange={(e) => updateField('message', e.target.value)}
            className="border border-slate-300 rounded px-3 py-2"
            rows={5}
          />

          <button
            type="submit"
            disabled={submitting}
            className="bg-primary neon-glow text-white rounded px-4 py-2 font-semibold disabled:opacity-50 touch-manipulation self-start"
          >
            {submitting ? 'Enviando...' : 'Enviar feedback'}
          </button>
          {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
        </form>
      )}
    </div>
  );
}

export default FeedbackPage;
