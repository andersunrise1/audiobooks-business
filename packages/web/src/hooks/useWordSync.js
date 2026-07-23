import { useMemo } from 'react';

/**
 * Given a chapter's timestamped words and the current audio playback time,
 * returns the id of the word that should be highlighted right now (or null).
 */
export function useWordSync(words, currentTime) {
  return useMemo(() => {
    const active = words.find(
      (word) =>
        word.start_seconds != null &&
        word.end_seconds != null &&
        currentTime >= word.start_seconds &&
        currentTime < word.end_seconds,
    );
    return active?.id ?? null;
  }, [words, currentTime]);
}
