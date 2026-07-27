import { useEffect, useState } from 'react';
import { isDesktop } from '../../services/desktopBridge.js';

const SHORTCUTS = [
  { keys: 'Cmd/Ctrl+K', description: 'Buscar audiobook' },
  { keys: 'Cmd/Ctrl+L', description: 'Ver biblioteca' },
  { keys: 'Cmd/Ctrl+R', description: 'Revisar flashcards' },
  { keys: 'Cmd/Ctrl+P', description: 'Reproduzir/pausar' },
  { keys: 'Cmd/Ctrl+/', description: 'Mostrar esta ajuda' },
];

// Dia 65: desktop-only (see useKeyboardShortcuts.js for why). Opens either
// from the visible button here or from anywhere via Cmd/Ctrl+/, since a
// shortcut with no discoverable way to find out about it isn't very useful.
function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isDesktop) return undefined;
    function handleShowHelp() {
      setOpen(true);
    }
    window.addEventListener('techspeak:show-shortcuts-help', handleShowHelp);
    return () => window.removeEventListener('techspeak:show-shortcuts-help', handleShowHelp);
  }, []);

  if (!isDesktop) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-slate-500 py-2 touch-manipulation"
        aria-label="Atalhos de teclado"
        title="Atalhos de teclado"
      >
        ⌨️
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-20"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white dark:bg-stone-800 rounded-lg p-6 max-w-sm w-full flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">Atalhos de teclado</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {SHORTCUTS.map((shortcut) => (
                <li key={shortcut.keys} className="flex items-center justify-between gap-4">
                  <span className="text-slate-600">{shortcut.description}</span>
                  <kbd className="bg-slate-100 dark:bg-stone-700 rounded px-2 py-1 font-mono text-xs">
                    {shortcut.keys}
                  </kbd>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="bg-blue-600 dark:bg-blue-500 neon-glow text-white rounded px-4 py-2 font-semibold self-end touch-manipulation"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default KeyboardShortcutsHelp;
