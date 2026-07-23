const MASTERED_INTERVAL_DAYS = 21;

/**
 * SM-2 spaced repetition algorithm.
 * quality: 0-5, how well the user recalled the word (0 = total blackout, 5 = perfect recall).
 */
export function applySm2({ quality, easeFactor, intervalDays, reviewCount }) {
  const clampedQuality = Math.min(5, Math.max(0, quality));

  let nextReviewCount;
  let nextIntervalDays;

  if (clampedQuality < 3) {
    nextReviewCount = 0;
    nextIntervalDays = 1;
  } else {
    nextReviewCount = reviewCount + 1;
    if (nextReviewCount === 1) nextIntervalDays = 1;
    else if (nextReviewCount === 2) nextIntervalDays = 6;
    else nextIntervalDays = Math.round(intervalDays * easeFactor);
  }

  const nextEaseFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - clampedQuality) * (0.08 + (5 - clampedQuality) * 0.02)),
  );

  const learningStatus =
    nextReviewCount === 0
      ? 'new'
      : nextIntervalDays >= MASTERED_INTERVAL_DAYS
        ? 'mastered'
        : 'learning';

  return {
    easeFactor: nextEaseFactor,
    intervalDays: nextIntervalDays,
    reviewCount: nextReviewCount,
    learningStatus,
  };
}
