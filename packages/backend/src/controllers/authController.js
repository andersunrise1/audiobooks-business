import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

const SALT_ROUNDS = 12;

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    isAdmin: user.is_admin,
  };
}

export async function register(req, res) {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, plan, is_admin`,
      [email, passwordHash, name || null],
    );
    const user = rows[0];

    res.status(201).json({
      user: toPublicUser(user),
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'email already registered' });
    }
    throw err;
  }
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  res.json({
    user: toPublicUser(user),
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  });
}

export async function getCurrentUser(req, res) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = rows[0];

  if (!user) {
    return res.status(404).json({ error: 'user not found' });
  }

  res.json({ user: toPublicUser(user) });
}

export async function refreshToken(req, res) {
  const { refreshToken: token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'refreshToken is required' });
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    return res.status(401).json({ error: 'invalid or expired refresh token' });
  }

  const { rows } = await pool.query('SELECT id, email FROM users WHERE id = $1', [payload.sub]);
  const user = rows[0];

  if (!user) {
    return res.status(401).json({ error: 'user no longer exists' });
  }

  res.json({ accessToken: signAccessToken(user) });
}
