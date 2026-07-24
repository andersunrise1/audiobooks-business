function normalizeWords(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

// What fraction of the target sentence's words were recognized in the
// Deepgram transcript (order-independent). Mirrors packages/web's
// pronunciationScore.js (Web Speech API version, Dia 18) so the scoring
// logic is consistent regardless of which transcription engine produced
// the spoken text.
export function scorePronunciation(targetSentence, spokenText) {
  const targetWords = normalizeWords(targetSentence);
  const spokenWords = new Set(normalizeWords(spokenText));

  if (targetWords.length === 0) {
    return { score: 0, matchedWords: [], unmatchedWords: [] };
  }

  const matchedWords = [];
  const unmatchedWords = [];

  for (const word of new Set(targetWords)) {
    (spokenWords.has(word) ? matchedWords : unmatchedWords).push(word);
  }

  const matchedCount = targetWords.filter((word) => spokenWords.has(word)).length;
  const score = Math.round((matchedCount / targetWords.length) * 100);

  return { score, matchedWords, unmatchedWords };
}
