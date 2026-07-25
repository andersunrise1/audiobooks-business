export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const isFormData = body instanceof FormData;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      // Let the browser set Content-Type (with the multipart boundary) itself for FormData.
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed with status ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return data;
}
