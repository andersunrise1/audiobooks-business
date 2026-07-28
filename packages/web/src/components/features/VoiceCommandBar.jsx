import { useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function VoiceCommandBar({ context, onNextChapter }) {
  const { accessToken } = useAuth();
  const [status, setStatus] = useState('idle'); // idle | listening | processing | done | error
  const [feedback, setFeedback] = useState(null);

  const isSupported = Boolean(getSpeechRecognition());

  function startListening() {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setStatus('processing');

      try {
        const data = await apiRequest('/api/voice/command', {
          method: 'POST',
          token: accessToken,
          body: { transcript, context },
        });

        if (data.intent === 'next_chapter') {
          onNextChapter?.();
        }

        setFeedback({ transcript, ...data });
        setStatus('done');
      } catch (err) {
        setFeedback({ transcript, error: err.message });
        setStatus('error');
      }
    };

    recognition.onerror = (event) => {
      setFeedback({
        error:
          event.error === 'not-allowed'
            ? 'Permissão de microfone negada.'
            : `Erro ao gravar: ${event.error}`,
      });
      setStatus('error');
    };

    recognition.onend = () => {
      setStatus((current) => (current === 'listening' ? 'idle' : current));
    };

    setFeedback(null);
    setStatus('listening');
    recognition.start();
  }

  if (!isSupported) return null;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-stone-700 p-4 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={startListening}
          disabled={status === 'listening' || status === 'processing'}
          className={`px-4 py-2 rounded text-white disabled:opacity-50 ${
            status === 'listening' ? 'bg-red-600' : 'bg-primary neon-glow'
          }`}
        >
          {status === 'listening'
            ? 'Ouvindo...'
            : status === 'processing'
              ? 'Processando...'
              : '🎤 Comando de voz'}
        </button>
        <span className="text-xs text-slate-500 dark:text-stone-400">
          &quot;Explain X&quot; · &quot;Next chapter&quot; · &quot;Check my progress&quot;
        </span>
      </div>

      {feedback?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{feedback.error}</p>
      )}

      {feedback?.intent === 'explain' && (
        <p className="text-sm text-slate-500 dark:text-stone-400">
          <strong>{feedback.word}:</strong> {feedback.explanation}
        </p>
      )}
      {feedback?.intent === 'next_chapter' && (
        <p className="text-sm text-slate-500 dark:text-stone-400">
          Indo para o próximo capítulo...
        </p>
      )}
      {feedback?.intent === 'progress' && feedback.stats && (
        <p className="text-sm text-slate-500 dark:text-stone-400">
          Streak: {feedback.stats.streakDays} dia(s) · Palavras hoje:{' '}
          {feedback.stats.wordsLearned.today} · Flashcards a revisar: {feedback.stats.flashcardsDue}
        </p>
      )}
      {feedback?.intent === 'unknown' && (
        <p className="text-sm text-slate-500 dark:text-stone-400">
          Não entendi: &quot;{feedback.transcript}&quot;
        </p>
      )}
    </div>
  );
}

export default VoiceCommandBar;
