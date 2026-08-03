// Dia 71-72: shared setup for the load-testing scripts. Registers a small
// pool of real test users against the target server (default: this
// machine's local dev backend) and looks up a real free audiobook/chapter
// to hit - deliberately real data, not fixtures, since the point is
// measuring how the actual running server behaves.

export const BASE_URL = process.env.LOADTEST_BASE_URL || 'http://localhost:3000';

export async function registerTestUser(index) {
  const email = `loadtest-${Date.now()}-${index}@techspeaking.dev`;
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'LoadTest123!', name: `Load Test ${index}` }),
  });
  if (!res.ok) throw new Error(`failed to register test user ${index}: ${res.status}`);
  const data = await res.json();
  return { id: data.user.id, email, accessToken: data.accessToken };
}

export async function getFreeAudiobook() {
  const res = await fetch(`${BASE_URL}/api/audiobooks`);
  if (!res.ok) throw new Error(`failed to list audiobooks: ${res.status}`);
  const books = await res.json();
  const free = books.find((b) => b.is_free);
  if (!free) throw new Error('no free audiobook found - is the DB seeded?');
  return free;
}

export async function cleanupTestUsers(pool, userIds) {
  if (userIds.length === 0) return;
  await pool.query('DELETE FROM users WHERE id = ANY($1)', [userIds]);
}
