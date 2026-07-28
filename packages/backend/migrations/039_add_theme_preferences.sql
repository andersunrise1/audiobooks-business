-- Dia 68-69: customizable theme preferences (primary color, font size),
-- on top of Dia 66-67's light/dark/system toggle (which stays purely
-- client-side in localStorage - it's a display preference with no
-- cross-device meaning, unlike color/font-size which the user picks once
-- and reasonably expects to follow them to another device/browser).
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_primary_color VARCHAR NOT NULL DEFAULT 'blue';
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_font_size VARCHAR NOT NULL DEFAULT 'medium';
