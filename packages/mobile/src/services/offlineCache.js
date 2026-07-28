import AsyncStorage from '@react-native-async-storage/async-storage';

// Dia 86-90 "offline support": a deliberately simpler MVP than
// packages/desktop's sync-queue architecture (Dia 20/61-64's real SQLite
// queue with conflict-resolved replay). Mobile has no equivalent local
// database wired up yet, and this app doesn't queue *writes* made while
// offline (a flashcard review or progress update made offline is simply not
// saved, matching this project's established pattern of scoping down rather
// than half-building a feature - see the Deepgram removal, no email
// service). What this DOES provide, for real: the last successful
// GET /api/user/stats and GET /api/user/flashcards responses are cached to
// AsyncStorage, so a user who opens the app offline sees their last-known
// numbers instead of a bare error screen - the same "read-only offline
// fallback" already used by packages/web's own desktop bridge for these
// same two screens.
const STATS_KEY = 'techspeak_cache_stats';
const FLASHCARDS_KEY = 'techspeak_cache_flashcards';

export async function cacheStats(stats) {
  try {
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Best-effort - a failed cache write shouldn't break the dashboard.
  }
}

export async function getCachedStats() {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function cacheFlashcards(cards) {
  try {
    await AsyncStorage.setItem(FLASHCARDS_KEY, JSON.stringify(cards));
  } catch {
    // Best-effort.
  }
}

export async function getCachedFlashcards() {
  try {
    const raw = await AsyncStorage.getItem(FLASHCARDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
