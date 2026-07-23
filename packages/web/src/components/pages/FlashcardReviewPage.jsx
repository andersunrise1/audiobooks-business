import { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

function FlashcardReviewPage() {
  const { accessToken } = useAuth();
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/api/user/flashcards', { token: accessToken })
      .then(setCards)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const card = cards[index];

  async function handleRate(quality) {
    if (!card) return;

    try {
      await apiRequest(`/api/user/flashcards/${card.id}/review`, {
        method: 'POST',
        token: accessToken,
        body: { quality },
      });
    } catch (err) {
      console.error('failed to save flashcard review', err);
    }

    setRevealed(false);
    setIndex((i) => i + 1);
  }

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  if (!card) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-2">Flashcards</h1>
        <p className="text-slate-500">Nenhum flashcard para revisar agora. Volte mais tarde!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-md">
      <div>
        <h1 className="text-2xl font-bold">Flashcards</h1>
        <p className="text-slate-500 text-sm">
          {index + 1} de {cards.length}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 p-6 flex flex-col gap-3 min-h-40 justify-center items-center text-center">
        <span className="text-xl font-bold">{card.word}</span>

        {revealed ? (
          <div className="flex flex-col gap-2">
            {card.portuguese_translation && <p>{card.portuguese_translation}</p>}
            {card.technical_explanation && (
              <p className="text-sm text-slate-500">{card.technical_explanation}</p>
            )}
            {card.example_sentence && (
              <p className="text-sm italic text-slate-400">“{card.example_sentence}”</p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="px-4 py-3 rounded bg-slate-900 text-white touch-manipulation"
          >
            Mostrar resposta
          </button>
        )}
      </div>

      {revealed && (
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleRate(1)}
            className="px-3 py-3 rounded bg-red-100 text-red-700 touch-manipulation"
          >
            Não lembrei
          </button>
          <button
            type="button"
            onClick={() => handleRate(3)}
            className="px-3 py-3 rounded bg-amber-100 text-amber-700 touch-manipulation"
          >
            Difícil
          </button>
          <button
            type="button"
            onClick={() => handleRate(5)}
            className="px-3 py-3 rounded bg-green-100 text-green-700 touch-manipulation"
          >
            Fácil
          </button>
        </div>
      )}
    </div>
  );
}

export default FlashcardReviewPage;
