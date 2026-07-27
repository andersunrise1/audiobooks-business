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

async function syncNow({ apiUrl, token }) {
  if (!apiUrl || !token) {
    return { ok: false, error: 'not_authenticated' };
  }

  try {
    const pushedProgress = await pushQueuedUpdates(apiUrl, token);
    const pushedReviews = await pushQueuedReviews(apiUrl, token);
    await pullLatest(apiUrl, token);
    return {
      ok: true,
      pushed: pushedProgress + pushedReviews,
      syncedAt: new Date().toISOString(),
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

module.exports = { syncNow };
