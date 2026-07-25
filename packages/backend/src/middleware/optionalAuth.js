import { verifyAccessToken } from '../utils/jwt.js';

// Unlike requireAuth, a missing or invalid token is not an error here - the
// route stays reachable by anonymous users, but req.user is populated when a
// valid token is present so the controller can apply plan-aware logic.
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;

  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = { id: payload.sub, email: payload.email };
    } catch {
      // ignore - treat as anonymous
    }
  }

  next();
}
