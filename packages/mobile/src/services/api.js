// Mirrors packages/web/src/services/api.js's contract (same apiRequest
// shape, same error.status attachment) so the mobile client talks to the
// exact same backend the same way - localhost only works from a simulator
// on the same machine as the backend; a real device needs this pointed at
// the dev machine's LAN IP (or a tunnel), set via EXPO_PUBLIC_API_URL.
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed with status ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return data;
}
