import { useEffect, useRef, useState } from 'react';
import { scorePronunciation } from '../../utils/pronunciationScore.js';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function normalizeForMatch(word) {
  return word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function PronunciationRecorder({ targetSentence }) {
  const { accessToken } = useAuth();

  const [status, setStatus] = useState('idle'); // idle | recording | done | error
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const recognitionRef = useRef(null);

  const [aiStatus, setAiStatus] = useState('idle'); // idle | recording | analyzing | done | error
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  const isSupported = Boolean(getSpeechRecognition());
  const isAiSupported = typeof window !== 'undefined' && 'MediaRecorder' in window;

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

  async function startAiRecording() {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setAiError('Permissão de microfone negada.');
      setAiStatus('error');
      return;
    }

    const mediaRecorder = new MediaRecorder(stream);
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      setAiStatus('analyzing');

      try {
        const form = new FormData();
        form.append(
          'audio',
          new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType }),
          'recording.webm',
        );
        form.append('targetSentence', targetSentence);

        const data = await apiRequest('/api/pronunciation/score', {
          method: 'POST',
          token: accessToken,
          body: form,
        });
        setAiResult(data);
        setAiStatus('done');
      } catch (err) {
        setAiError(err.message);
        setAiStatus('error');
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    setAiError('');
    setAiResult(null);
    setAiStatus('recording');
    mediaRecorder.start();
  }

  function stopAiRecording() {
    mediaRecorderRef.current?.stop();
  }

  if (!isSupported) {
    return (
      <p className="text-sm text-slate-500">
        Reconhecimento de voz não é suportado neste navegador.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4 flex flex-col gap-3">
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
            status === 'recording' ? 'bg-red-600' : 'bg-slate-900'
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

      {isAiSupported && (
        <div className="border-t border-slate-200 pt-3 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={aiStatus === 'recording' ? stopAiRecording : startAiRecording}
              disabled={aiStatus === 'analyzing'}
              className={`px-4 py-2 rounded text-sm text-white disabled:opacity-50 ${
                aiStatus === 'recording' ? 'bg-red-600' : 'bg-indigo-700'
              }`}
            >
              {aiStatus === 'recording'
                ? 'Parar'
                : aiStatus === 'analyzing'
                  ? 'Analisando...'
                  : 'Analisar com IA'}
            </button>
            <span className="text-xs text-slate-400">Transcrição via Deepgram</span>
          </div>

          {aiStatus === 'error' && <p className="text-sm text-red-500">{aiError}</p>}
          {aiStatus === 'done' && aiResult && (
            <div className="text-sm text-slate-500">
              <p>A IA ouviu: “{aiResult.transcript}”</p>
              <p className="font-semibold mt-1">Pronúncia (IA): {aiResult.score}%</p>
              {aiResult.unmatchedWords.length > 0 && (
                <p className="text-xs mt-1">
                  Palavras a praticar: {aiResult.unmatchedWords.join(', ')}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PronunciationRecorder;
