// Deliberately simple pattern matching, not an LLM call - the plan scopes
// this as a Web Speech API MVP with a handful of fixed commands, not a
// general-purpose voice assistant.
export function parseVoiceCommand(transcript) {
  const text = transcript
    .trim()
    .toLowerCase()
    .replace(/[.?!]+$/, '');

  const explainMatch = text.match(/^(?:explain|what does|what is)\s+(.+?)(?:\s+mean)?$/);
  if (explainMatch && explainMatch[1]) {
    return { intent: 'explain', word: explainMatch[1].trim() };
  }

  if (/\b(?:play\s+)?next\s+chapter\b/.test(text)) {
    return { intent: 'next_chapter' };
  }

  if (/\b(?:check\s+)?my\s+progress\b|\bshow\s+my\s+progress\b/.test(text)) {
    return { intent: 'progress' };
  }

  return { intent: 'unknown' };
}
