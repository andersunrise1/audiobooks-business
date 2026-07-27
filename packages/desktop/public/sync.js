const db = require('./db');

async function apiRequest(apiUrl, path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`);
  }

  return res.json();
}

async function pushQueuedUpdates(apiUrl, token) {
  const queued = db.getQueuedUpdates();
  let pushed = 0;

  for (const entry of queued) {
    await apiRequest(apiUrl, `/api/user/progress/${entry.chapter_id}`, {
      method: 'POST',
      token,
      body: JSON.parse(entry.payload),
    });
    db.clearQueuedUpdate(entry.id);
    pushed += 1;
  }

  return pushed;
}

async function pushQueuedReviews(apiUrl, token) {
  const queued = db.getQueuedReviews();
  let pushed = 0;

  for (const entry of queued) {
    await apiRequest(apiUrl, `/api/user/flashcards/${entry.flashcard_id}/review`, {
      method: 'POST',
      token,
      body: { quality: entry.quality },
    });
    db.clearQueuedReview(entry.id);
    pushed += 1;
  }

  return pushed;
}

async function pullLatest(apiUrl, token) {
  const [progress, flashcards] = await Promise.all([
    apiRequest(apiUrl, '/api/user/progress', { token }),
    apiRequest(apiUrl, '/api/user/flashcards', { token }),
  ]);

  db.replaceCachedProgress(progress);
  db.replaceCachedFlashcards(flashcards);
}

const FLASHCARD_REMINDER_COOLDOWN_MS = 12 * 60 * 60 * 1000;

// Dia 63-64: computes which native notifications should fire this sync
// cycle and persists them (packages/desktop/public/db.js's `notifications`
// table, surfaced in the app as a notification center) - deliberately
// returns plain {type, title, body} objects instead of calling Electron's
// Notification API directly, so this stays testable with plain Node (no
// Electron dependency here); main.js is the only place that actually shows
// a native toast, using the list this returns. Dedup state (which
// audiobooks we've already announced, the last-seen streak, when we last
// nudged about due flashcards) lives in kv_state, since none of it is
// meaningful to sync to the backend.
async function checkForNotifications(apiUrl, token) {
  const events = [];

  const audiobooks = await apiRequest(apiUrl, '/api/audiobooks', { token });
  const knownIds = new Set(JSON.parse(db.getState('known_audiobook_ids') ?? '[]'));
  const newBooks = audiobooks.filter((book) => !knownIds.has(book.id));
  if (knownIds.size > 0) {
    for (const book of newBooks) {
      events.push({
        type: 'new_audiobook',
        title: 'Novo audiobook disponível',
        body: book.title,
      });
    }
  }
  // First sync ever: just record the current catalog, nothing to announce
  // yet (everything would look "new" otherwise).
  db.setState('known_audiobook_ids', JSON.stringify(audiobooks.map((book) => book.id)));

  const dueCount = db
    .getCachedFlashcards()
    .filter((card) => card.next_review && new Date(card.next_review) <= new Date()).length;
  const lastFlashcardNotifiedAt = db.getState('last_flashcard_notified_at');
  const flashcardCooldownElapsed =
    !lastFlashcardNotifiedAt ||
    Date.now() - new Date(lastFlashcardNotifiedAt).getTime() > FLASHCARD_REMINDER_COOLDOWN_MS;
  if (dueCount > 0 && flashcardCooldownElapsed) {
    events.push({
      type: 'flashcards_due',
      title: 'Flashcards para revisar',
      body: `Você tem ${dueCount} flashcard${dueCount > 1 ? 's' : ''} esperando revisão.`,
    });
    db.setState('last_flashcard_notified_at', new Date().toISOString());
  }

  const stats = await apiRequest(apiUrl, '/api/user/stats', { token });
  const previousStreak = Number(db.getState('last_streak') ?? '0');
  if (previousStreak > 0 && stats.streakDays === 0) {
    events.push({
      type: 'streak_broken',
      title: 'Sequência quebrada',
      body: `Sua sequência de ${previousStreak} dia${previousStreak > 1 ? 's' : ''} foi quebrada. Volte a estudar hoje!`,
    });
  }
  db.setState('last_streak', String(stats.streakDays));

  for (const event of events) {
    db.recordNotification(event.type, event.title, event.body);
  }

  return events;
}

async function syncNow({ apiUrl, token }) {
  if (!apiUrl || !token) {
    return { ok: false, error: 'not_authenticated' };
  }

  try {
    const pushedProgress = await pushQueuedUpdates(apiUrl, token);
    const pushedReviews = await pushQueuedReviews(apiUrl, token);
    await pullLatest(apiUrl, token);
    const notifications = await checkForNotifications(apiUrl, token);
    return {
      ok: true,
      pushed: pushedProgress + pushedReviews,
      notifications,
      syncedAt: new Date().toISOString(),
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

module.exports = { syncNow };
