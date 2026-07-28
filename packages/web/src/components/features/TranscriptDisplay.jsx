import { useEffect, useMemo, useState } from 'react';
import TranslationPopup from './TranslationPopup.jsx';

const POPUP_AUTO_CLOSE_MS = 3000;

function normalize(text) {
  return text.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

// Splits the transcript into display segments: a run of tokens matching a
// tagged word (possibly multi-word, e.g. "pull request") becomes one
// clickable segment; everything else stays as plain text. This keeps the
// full sentence visible even when only some words are tagged, instead of
// reconstructing the sentence purely from the tagged words.
function buildSegments(transcript, words) {
  const byWord = new Map(words.map((word) => [normalize(word.word), word]));
  const tokens = transcript.split(/(\s+)/);
  const segments = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    if (token === '' || /^\s+$/.test(token)) {
      segments.push({ type: 'text', text: token });
      i += 1;
      continue;
    }

    const gap = tokens[i + 1];
    const next = tokens[i + 2];
    if (gap !== undefined && next !== undefined) {
      const twoWordMatch = byWord.get(normalize(`${token} ${next}`));
      if (twoWordMatch) {
        segments.push({ type: 'word', text: `${token}${gap}${next}`, word: twoWordMatch });
        i += 3;
        continue;
      }
    }

    const match = byWord.get(normalize(token));
    segments.push(
      match ? { type: 'word', text: token, word: match } : { type: 'text', text: token },
    );
    i += 1;
  }

  return segments;
}

function TranscriptDisplay({ words, activeWordId, transcript, onWordClick }) {
  const [selectedWordId, setSelectedWordId] = useState(null);

  useEffect(() => {
    if (!selectedWordId) return undefined;
    const timer = setTimeout(() => setSelectedWordId(null), POPUP_AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [selectedWordId]);

  const segments = useMemo(() => buildSegments(transcript ?? '', words), [transcript, words]);
  const hasClickableWords = segments.some((segment) => segment.type === 'word');

  if (!transcript) return null;

  const selectedWord = words.find((word) => word.id === selectedWordId) ?? null;

  function selectWord(word) {
    setSelectedWordId(word.id);
    onWordClick?.(word);
  }

  if (!hasClickableWords) {
    return <p className="leading-relaxed text-slate-700 dark:text-stone-200">{transcript}</p>;
  }

  return (
    <>
      <p className="leading-loose text-slate-700 dark:text-stone-200">
        {segments.map((segment, index) =>
          segment.type === 'word' ? (
            <span
              key={`${segment.word.id}-${index}`}
              role="button"
              tabIndex={0}
              onClick={() => selectWord(segment.word)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') selectWord(segment.word);
              }}
              className={`rounded px-1 py-1 cursor-pointer touch-manipulation transition-colors hover:bg-slate-200 hover:text-slate-900 ${
                segment.word.id === activeWordId ? 'bg-yellow-200 text-slate-900 font-semibold' : ''
              }`}
            >
              {segment.text}
            </span>
          ) : (
            <span key={index}>{segment.text}</span>
          ),
        )}
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
