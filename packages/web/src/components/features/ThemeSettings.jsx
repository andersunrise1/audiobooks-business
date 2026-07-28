import { useEffect, useRef, useState } from 'react';
import { useTheme, PRIMARY_COLORS, FONT_SIZES } from '../../store/ThemeContext.jsx';

const COLOR_SWATCH_CLASS = {
  blue: 'bg-blue-600',
  purple: 'bg-purple-600',
  green: 'bg-green-600',
  red: 'bg-red-600',
};

const COLOR_LABEL = { blue: 'Azul', purple: 'Roxo', green: 'Verde', red: 'Vermelho' };
const FONT_SIZE_LABEL = { small: 'Pequena', medium: 'Média', large: 'Grande' };

// Dia 68-69: primary color and font size, on top of Dia 66-67's light/
// dark/system toggle. Both persist to localStorage immediately and, for a
// logged-in user, to their account (ThemeContext.jsx's saveThemePreferences)
// so the choice follows them to another device.
function ThemeSettings() {
  const { primaryColor, setPrimaryColor, fontSize, setFontSize } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  // Dia 70: Escape and click-outside both close the popover, matching
  // standard disclosure-widget keyboard/mouse behavior. Escape additionally
  // returns focus to the trigger button.
  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function handleClickOutside(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-sm py-2 touch-manipulation"
        aria-label="Personalizar tema"
        title="Personalizar tema"
        aria-haspopup="true"
        aria-expanded={open}
      >
        🎨
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-lg shadow-lg z-10 p-3 flex flex-col gap-3 text-sm">
          <div>
            <p className="font-semibold mb-2">Cor principal</p>
            <div className="flex gap-2">
              {PRIMARY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setPrimaryColor(color)}
                  aria-label={COLOR_LABEL[color]}
                  aria-pressed={primaryColor === color}
                  title={COLOR_LABEL[color]}
                  className={`w-7 h-7 rounded-full touch-manipulation ${COLOR_SWATCH_CLASS[color]} ${
                    primaryColor === color
                      ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-offset-stone-800 dark:ring-stone-100'
                      : ''
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="font-semibold mb-2">Tamanho da fonte</p>
            <div className="flex gap-2">
              {FONT_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setFontSize(size)}
                  aria-pressed={fontSize === size}
                  className={`px-2 py-1 rounded touch-manipulation ${
                    fontSize === size
                      ? 'bg-primary neon-glow text-white'
                      : 'bg-slate-100 dark:bg-stone-700'
                  }`}
                >
                  {FONT_SIZE_LABEL[size]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemeSettings;
