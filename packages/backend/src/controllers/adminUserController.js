import { listUsers, setUserAdminStatus } from '../services/adminUserService.js';

export async function getUsers(req, res) {
  const users = await listUsers();
  res.json(users);
}

export async function updateUserAdminStatus(req, res) {
  const { id } = req.params;
  const { isAdmin } = req.body;

  if (typeof isAdmin !== 'boolean') {
    return res.status(400).json({ error: 'isAdmin must be a boolean' });
  }

  // A lone admin demoting themselves would lock the account out of every
  // admin route with no self-service way back in (is_admin is DB-only).
  if (id === req.user.id && isAdmin === false) {
    return res.status(400).json({ error: 'cannot remove your own admin access' });
  }

  let user;
  try {
    user = await setUserAdminStatus(id, isAdmin);
  } catch (err) {
    if (err.code === 'ADMIN_EMAIL_MISMATCH') {
      return res.status(403).json({ error: err.message });
    }
    throw err;
  }

  if (!user) {
    return res.status(404).json({ error: 'user not found' });
  }

  res.json(user);
}
