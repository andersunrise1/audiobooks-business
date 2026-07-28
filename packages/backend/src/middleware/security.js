// Dia 75: HTTPS enforcement. Real deployments (per CLAUDE.md, hosting isn't
// chosen yet) almost always sit behind a reverse proxy/load balancer that
// terminates TLS and forwards plain HTTP internally - `req.secure` alone
// would be false even for a genuinely HTTPS request, so this checks the
// standard `X-Forwarded-Proto` header too. Gated on NODE_ENV=production so
// local dev (plain http://localhost) and the test suite are unaffected.
export function enforceHttps(req, res, next) {
  if (process.env.NODE_ENV !== 'production') return next();

  const isSecure = req.secure || req.get('x-forwarded-proto') === 'https';
  if (isSecure) {
    res.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
    return next();
  }

  return res.redirect(308, `https://${req.get('host')}${req.originalUrl}`);
}
