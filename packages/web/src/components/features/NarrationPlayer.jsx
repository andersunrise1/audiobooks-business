import { useEffect, useState } from 'react';

const SPEED_OPTIONS = [0.7, 0.8, 1.0, 1.2, 1.5];
const VOICE_PREF_KEY = 'techspeak_narration_voice';

// The Web Speech API's SpeechSynthesisVoice has no real gender field - this
// is a best-effort heuristic (name matching against common browser/OS voice
// names), not a guarantee every voice list will classify correctly. Falls
// back to whatever English voice is available when nothing matches the
// preferred gender.
const FEMALE_HINTS = [
  'female',
  'zira',
  'susan',
  'samantha',
  'victoria',
  'karen',
  'moira',
  'tessa',
  'fiona',
  'serena',
  'aria',
  'jenny',
  'salli',
  'joanna',
  'kimberly',
  'ivy',
  'maria',
  'luciana',
  'helena',
  'camila',
];
const MALE_HINTS = [
  'male',
  'david',
  'mark',
  'daniel',
  'alex',
  'fred',
  'george',
  'james',
  'guy',
  'brian',
  'justin',
  'matthew',
  'eric',
  'ricardo',
  'felipe',
];

function classifyVoice(voice) {
  const name = voice.name.toLowerCase();
  if (FEMALE_HINTS.some((hint) => name.includes(hint))) return 'female';
  if (MALE_HINTS.some((hint) => name.includes(hint))) return 'male';
  return 'unknown';
}

// Optional browser-based narration for chapters with no real recorded
// audio (24 of the catalog's 25 audiobooks, as of this feature) - zero
// cost, no external TTS account needed, unlike ElevenLabs or a similar
// paid service. Quality and available voices depend entirely on the
// user's browser/OS, which is a real trade-off against a professionally
// recorded or AI-generated voice.
function NarrationPlayer({ text, onEnded }) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [voices, setVoices] = useState([]);
  const [genderPref, setGenderPref] = useState(
    () => localStorage.getItem(VOICE_PREF_KEY) || 'female',
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!supported) return undefined;
    function loadVoices() {
      setVoices(window.speechSynthesis.getVoices());
    }
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, [supported]);

  useEffect(() => {
    localStorage.setItem(VOICE_PREF_KEY, genderPref);
  }, [genderPref]);

  // Stop narration when the chapter text changes or the component unmounts
  // - otherwise speechSynthesis keeps talking over a chapter the reader has
  // already left.
  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [text, supported]);

  function pickVoice(pref) {
    const english = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
    const pool = english.length > 0 ? english : voices;
    return pool.find((v) => classifyVoice(v) === pref) ?? pool[0] ?? null;
  }

  function speak(rate) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(genderPref);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.onboundary = (event) => {
      if (typeof event.charIndex === 'number' && text.length > 0) {
        setProgress(event.charIndex / text.length);
      }
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setProgress(1);
      onEnded?.();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
    setProgress(0);
  }

  function togglePlay() {
    if (!supported || !text) return;
    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      return;
    }
    if (isSpeaking && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      return;
    }
    speak(speed);
  }

  function stop() {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setProgress(0);
  }

  // Changing the rate mid-utterance has no effect on an already-started
  // SpeechSynthesisUtterance, so cycling speed while speaking restarts
  // narration from the beginning at the new rate - an honest trade-off
  // rather than pretending a live rate change is possible.
  function cycleSpeed() {
    const index = SPEED_OPTIONS.indexOf(speed);
    const next = SPEED_OPTIONS[(index + 1) % SPEED_OPTIONS.length];
    setSpeed(next);
    if (isSpeaking) speak(next);
  }

  function selectGender(pref) {
    setGenderPref(pref);
    if (isSpeaking) stop();
  }

  if (!supported) {
    return (
      <p className="fixed inset-x-0 bottom-0 z-30 text-sm text-stone-300 bg-black border-t border-stone-800 p-3">
        Narração por voz não é suportada neste navegador. Você ainda pode ler o capítulo
        normalmente.
      </p>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 bg-black border-t border-stone-800 flex flex-col gap-3 p-3">
      <div className="h-1.5 rounded-full bg-stone-800 overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={cycleSpeed}
          className="px-2.5 h-9 rounded-full bg-stone-800 text-stone-200 text-sm font-medium touch-manipulation"
          aria-label="Alterar velocidade da narração"
        >
          {speed}x
        </button>

        <button
          type="button"
          onClick={() => selectGender('female')}
          aria-pressed={genderPref === 'female'}
          className={`px-2.5 h-9 rounded-full text-sm font-medium touch-manipulation ${
            genderPref === 'female' ? 'bg-primary/20 text-primary' : 'bg-stone-800 text-stone-200'
          }`}
          aria-label="Voz feminina"
        >
          Mulher
        </button>

        <button
          type="button"
          onClick={() => selectGender('male')}
          aria-pressed={genderPref === 'male'}
          className={`px-2.5 h-9 rounded-full text-sm font-medium touch-manipulation ${
            genderPref === 'male' ? 'bg-primary/20 text-primary' : 'bg-stone-800 text-stone-200'
          }`}
          aria-label="Voz masculina"
        >
          Homem
        </button>

        <button
          type="button"
          onClick={togglePlay}
          className="w-14 h-14 shrink-0 flex items-center justify-center rounded-full bg-primary neon-glow text-white text-xl touch-manipulation"
          aria-label={isSpeaking && !isPaused ? 'Pausar narração' : 'Ouvir narração'}
        >
          {isSpeaking && !isPaused ? '⏸' : '▶'}
        </button>

        <button
          type="button"
          onClick={stop}
          disabled={!isSpeaking}
          className="w-9 h-9 flex items-center justify-center rounded-full text-stone-300 disabled:opacity-30 touch-manipulation"
          aria-label="Parar narração"
        >
          ⏹
        </button>
      </div>
    </div>
  );
}

export default NarrationPlayer;
