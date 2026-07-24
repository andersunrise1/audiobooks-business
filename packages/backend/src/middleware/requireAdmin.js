import { pool } from '../config/database.js';

export async function requireAdmin(req, res, next) {
  const { rows } = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);

  if (!rows[0]?.is_admin) {
    return res.status(403).json({ error: 'admin access required' });
  }

  next();
}
