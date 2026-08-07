// Direct port of packages/web/src/components/features/TranscriptDisplay.jsx's
// buildSegments/normalize - pure JS, no DOM dependency, so the exact same
// matching logic applies on mobile too. Every non-punctuation token becomes
// a clickable "word" segment: `word` carries the already-loaded data when
// the token matches a tagged vocabulary term (possibly multi-word, e.g.
// "pull request"), or is null for any other token, which the caller
// resolves on demand via onTranslateWord - this was mobile's real gap
// (Dia 96-100 feedback: only pre-tagged words were clickable here, unlike
// web's "click any word" behavior). A token that normalizes to an empty
// string (pure punctuation) stays plain text - there's no real word there.
export function normalize(text) {
  return text.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

export function buildSegments(transcript, words) {
  const byWord = new Map(words.map((word) => [normalize(word.word), word]));
  const tokens = (transcript ?? '').split(/(\s+)/);
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
