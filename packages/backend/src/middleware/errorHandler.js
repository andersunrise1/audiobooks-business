export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  // Only surface the raw error message for deliberate client errors (4xx).
  // Unexpected 500s (DB errors, bugs, etc.) could leak internal details
  // (table/column names, driver messages) if passed through to the client.
  const message = status < 500 ? err.message || 'Request error' : 'Internal server error';
  res.status(status).json({ error: message });
}
