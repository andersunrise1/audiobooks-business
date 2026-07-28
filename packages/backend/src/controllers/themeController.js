import { updateThemePreferences, PRIMARY_COLORS, FONT_SIZES } from '../services/themeService.js';

export async function updateTheme(req, res) {
  const { primaryColor, fontSize } = req.body;

  if (!PRIMARY_COLORS.includes(primaryColor)) {
    return res
      .status(400)
      .json({ error: `primaryColor must be one of: ${PRIMARY_COLORS.join(', ')}` });
  }

  if (!FONT_SIZES.includes(fontSize)) {
    return res.status(400).json({ error: `fontSize must be one of: ${FONT_SIZES.join(', ')}` });
  }

  const user = await updateThemePreferences(req.user.id, { primaryColor, fontSize });

  if (!user) {
    return res.status(404).json({ error: 'user not found' });
  }

  res.json({ user });
}
