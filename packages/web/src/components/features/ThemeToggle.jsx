import { useTheme } from '../../store/ThemeContext.jsx';

const CYCLE = ['light', 'dark', 'system'];
const LABELS = { light: '☀️ Claro', dark: '🌙 Escuro', system: '🖥️ Automático' };

// Dia 66-67: light -> dark -> system -> light, one click at a time. Persisted
// and re-applied on load by ThemeContext.jsx; "system" live-updates if the
// OS preference changes while the app stays open.
function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  function handleClick() {
    const nextIndex = (CYCLE.indexOf(theme) + 1) % CYCLE.length;
    setTheme(CYCLE[nextIndex]);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-sm py-2 touch-manipulation"
      title="Alternar tema"
    >
      {LABELS[theme]}
    </button>
  );
}

export default ThemeToggle;
