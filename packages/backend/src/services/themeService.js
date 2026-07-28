import { pool } from '../config/database.js';

export const PRIMARY_COLORS = ['blue', 'purple', 'green', 'red'];
export const FONT_SIZES = ['small', 'medium', 'large'];

export async function updateThemePreferences(userId, { primaryColor, fontSize }) {
  const { rows } = await pool.query(
    `UPDATE users SET theme_primary_color = $1, theme_font_size = $2 WHERE id = $3
     RETURNING id, email, name, plan, is_admin, theme_primary_color, theme_font_size`,
    [primaryColor, fontSize, userId],
  );

  const user = rows[0];
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    isAdmin: user.is_admin,
    themePrimaryColor: user.theme_primary_color,
    themeFontSize: user.theme_font_size,
  };
}
