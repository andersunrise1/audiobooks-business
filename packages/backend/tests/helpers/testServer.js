import { createApp } from '../../src/app.js';

export function startTestServer() {
  return new Promise((resolve) => {
    const app = createApp();
    const server = app.listen(0, () => {
      resolve({ server, baseUrl: `http://localhost:${server.address().port}` });
    });
  });
}

export function stopTestServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

export async function registerTestUser(baseUrl, overrides = {}) {
  const email =
    overrides.email ?? `test-${Date.now()}-${Math.random().toString(36).slice(2)}@techspeak.test`;
  const password = overrides.password ?? 'correct-horse-battery-staple';

  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: overrides.name ?? 'Test User' }),
  });

  const data = await res.json();
  return { email, password, ...data };
}
