import { useEffect, useRef, useState } from 'react';
import { scorePronunciation } from '../../utils/pronunciationScore.js';

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function normalizeForMatch(word) {
  return word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function PronunciationRecorder({ targetSentence }) {
  const [status, setStatus] = useState('idle'); // idle | recording | done | error
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  const isSupported = Boolean(getSpeechRecognition());

  function startRecording() {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      setTranscript(event.results[0][0].transcript);
      setResult(scorePronunciation(targetSentence, event.results[0][0].transcript));
      setStatus('done');
    };

    recognition.onerror = (event) => {
      setErrorMessage(
        event.error === 'not-allowed'
          ? 'Permissão de microfone negada.'
          : `Erro ao gravar: ${event.error}`,
      );
      setStatus('error');
    };

    recognition.onend = () => {
      setStatus((current) => (current === 'recording' ? 'idle' : current));
    };

    recognitionRef.current = recognition;
    setTranscript('');
    setResult(null);
    setErrorMessage('');
    setStatus('recording');
    recognition.start();
  }

  function stopRecording() {
    recognitionRef.current?.stop();
  }

  if (!isSupported) {
    return (
      <p className="text-sm text-slate-500">
        Reconhecimento de voz não é suportado neste navegador.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-stone-700 p-4 flex flex-col gap-3">
      <p className="text-sm text-slate-500">Pratique a pronúncia desta frase:</p>
      <p className="italic">
        “
        {targetSentence.split(/\s+/).map((word, i) => (
          <span
            key={i}
            className={
              result &&
              (result.matchedWords.has(normalizeForMatch(word)) ? 'text-green-600' : 'text-red-500')
            }
          >
            {word}{' '}
          </span>
        ))}
        ”
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={status === 'recording' ? stopRecording : startRecording}
          className={`px-4 py-2 rounded text-white ${
            status === 'recording' ? 'bg-red-600' : 'bg-primary neon-glow'
          }`}
        >
          {status === 'recording' ? 'Parar' : 'Gravar a frase'}
        </button>

        {status === 'recording' && (
          <div className="flex items-end gap-0.5 h-6" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((bar) => (
              <span
                key={bar}
                className="w-1 bg-red-500 rounded-full animate-pulse"
                style={{ height: `${40 + (bar % 3) * 20}%`, animationDelay: `${bar * 100}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      {status === 'error' && <p className="text-sm text-red-500">{errorMessage}</p>}
      {status === 'done' && result && (
        <div className="text-sm text-slate-500">
          <p>Você disse: “{transcript}”</p>
          <p className="font-semibold mt-1">Pronúncia: {result.score}%</p>
        </div>
      )}
    </div>
  );
}

export default PronunciationRecorder;
