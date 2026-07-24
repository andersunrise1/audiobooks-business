import { useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

const OPTIONS = [
  { value: 'sim', label: 'Sim' },
  { value: 'mais-ou-menos', label: 'Mais ou menos' },
  { value: 'nao-entendi', label: 'Não entendi' },
];

function ChapterFeedback({ chapterId }) {
  const { accessToken } = useAuth();
  const [selected, setSelected] = useState(null);
  const [remedial, setRemedial] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSelect(value) {
    setSelected(value);

    if (value !== 'nao-entendi') return;

    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/api/ai/remedial', {
        method: 'POST',
        token: accessToken,
        body: { chapterId },
      });
      setRemedial(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-slate-200 rounded-lg p-4 flex flex-col gap-3">
      <p className="font-semibold">Você entendeu este capítulo?</p>

      <div className="flex gap-2">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            className={`px-3 py-2 rounded text-sm ${
              selected === option.value
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 hover:bg-slate-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {selected && selected !== 'nao-entendi' && (
        <p className="text-sm text-slate-500">Obrigado pelo feedback!</p>
      )}

      {loading && <p className="text-sm text-slate-500">Gerando material de apoio...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {remedial && (
        <div className="flex flex-col gap-2 text-sm border-t border-slate-200 pt-3">
          {remedial.summary && (
            <p>
              <strong>Resumo:</strong> {remedial.summary}
            </p>
          )}
          {remedial.keywords.length > 0 && (
            <p>
              <strong>Palavras-chave:</strong> {remedial.keywords.join(', ')}
            </p>
          )}
          {remedial.exercise && (
            <p>
              <strong>Exercício:</strong> {remedial.exercise}
            </p>
          )}

          {remedial.fallback && (
            <div className="flex flex-col gap-1 border border-amber-200 bg-amber-50 rounded-lg p-2 text-xs text-slate-600">
              <p className="font-semibold">Perguntas frequentes</p>
              {remedial.faq.map((item) => (
                <p key={item.question}>
                  <strong>{item.question}</strong> {item.answer}
                </p>
              ))}
              <p>
                Documentação:{' '}
                <a
                  href={remedial.externalDocsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {remedial.externalDocsUrl}
                </a>
              </p>
              <p>Suporte: {remedial.supportContact}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ChapterFeedback;
