function normalizeWords(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Rough pronunciation score: what fraction of the target sentence's words
 * were recognized in what the user actually said (order-independent).
 */
export function scorePronunciation(targetSentence, spokenText) {
  const targetWords = normalizeWords(targetSentence);
  const spokenWords = new Set(normalizeWords(spokenText));

  if (targetWords.length === 0) {
    return { score: 0, matchedWords: new Set() };
  }

  const matchedWords = new Set(targetWords.filter((word) => spokenWords.has(word)));
  const score = Math.round((matchedWords.size / targetWords.length) * 100);

  return { score, matchedWords };
}
