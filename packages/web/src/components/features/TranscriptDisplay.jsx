import { useEffect, useState } from 'react';
import TranslationPopup from './TranslationPopup.jsx';

const POPUP_AUTO_CLOSE_MS = 3000;

function TranscriptDisplay({ words, activeWordId, transcript, onWordClick }) {
  const [selectedWordId, setSelectedWordId] = useState(null);

  useEffect(() => {
    if (!selectedWordId) return undefined;
    const timer = setTimeout(() => setSelectedWordId(null), POPUP_AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [selectedWordId]);

  if (words.length === 0) {
    if (!transcript) return null;
    return <p className="leading-relaxed text-slate-700">{transcript}</p>;
  }

  const selectedWord = words.find((word) => word.id === selectedWordId) ?? null;

  function selectWord(word) {
    setSelectedWordId(word.id);
    onWordClick?.(word);
  }

  return (
    <>
      <p className="leading-loose text-slate-700">
        {words.map((word) => (
          <span
            key={word.id}
            role="button"
            tabIndex={0}
            onClick={() => selectWord(word)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') selectWord(word);
            }}
            className={`inline-block mr-1 rounded px-1 py-1 cursor-pointer touch-manipulation transition-colors hover:bg-slate-200 ${
              word.id === activeWordId ? 'bg-yellow-200 font-semibold' : ''
            }`}
          >
            {word.word}
          </span>
        ))}
      </p>

      <TranslationPopup
        key={selectedWordId}
        word={selectedWord}
        onClose={() => setSelectedWordId(null)}
      />
    </>
  );
}

export default TranscriptDisplay;
