import { useMemo, useState } from 'react';
import TranslationPopup from './TranslationPopup.jsx';

function normalize(text) {
  return text.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

// Every non-whitespace token becomes a clickable "word" segment (Dia
// [current]: "todas as palavras tem que ficar clicaveis com pop up",
// matching a reference reading app) - `word` carries the already-loaded
// data when the token matches a tagged vocabulary term (possibly
// multi-word, e.g. "pull request"), or is null for any other token, which
// TranscriptDisplay resolves on demand via onTranslateWord. A token that
// normalizes to an empty string (pure punctuation, e.g. a lone quote mark)
// stays plain text - there's no real word there to translate.
function buildSegments(transcript, words) {
  const byWord = new Map(words.map((word) => [normalize(word.word), word]));
  const tokens = transcript.split(/(\s+)/);
  const segments = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    if (token === '' || /^\s+$/.test(token) || normalize(token) === '') {
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

    const match = byWord.get(normalize(token)) ?? null;
    segments.push({ type: 'word', text: token, word: match });
    i += 1;
  }

  return segments;
}

function TranscriptDisplay({
  words,
  activeWordId,
  transcript,
  onWordClick,
  onTranslateWord,
  fontSize = 'text-lg',
}) {
  const [selectedWord, setSelectedWord] = useState(null);
  const [loadingText, setLoadingText] = useState(null);

  const segments = useMemo(() => buildSegments(transcript ?? '', words), [transcript, words]);

  if (!transcript) return null;

  async function selectSegment(segment) {
    if (segment.word) {
      setSelectedWord(segment.word);
      onWordClick?.(segment.word);
      return;
    }

    if (!onTranslateWord) return;
    setLoadingText(segment.text);
    try {
      const resolved = await onTranslateWord(normalize(segment.text));
      if (resolved) setSelectedWord(resolved);
    } finally {
      setLoadingText(null);
    }
  }

  return (
    <>
      <p className={`${fontSize} leading-loose text-slate-700 dark:text-stone-200`}>
        {segments.map((segment, index) =>
          segment.type === 'word' ? (
            <span
              key={index}
              role="button"
              tabIndex={0}
              onClick={() => selectSegment(segment)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') selectSegment(segment);
              }}
              className={`rounded px-1 py-0.5 cursor-pointer touch-manipulation transition-colors ${
                segment.word && segment.word.id === activeWordId
                  ? 'bg-primary text-white font-semibold'
                  : loadingText === segment.text
                    ? 'bg-slate-200 dark:bg-stone-700 animate-pulse'
                    : 'hover:bg-slate-200 dark:hover:bg-stone-700'
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
        key={selectedWord?.id ?? selectedWord?.word}
        word={selectedWord}
        onClose={() => setSelectedWord(null)}
      />
    </>
  );
}

export default TranscriptDisplay;
