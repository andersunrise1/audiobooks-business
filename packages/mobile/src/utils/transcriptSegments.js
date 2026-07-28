// Direct port of packages/web/src/components/features/TranscriptDisplay.jsx's
// buildSegments/normalize - pure JS, no DOM dependency, so the exact same
// matching logic (including the Dia 42 fix: untagged tokens stay visible as
// plain text instead of only rendering tagged words) applies on mobile too.
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
