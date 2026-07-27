import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isDesktop } from '../services/desktopBridge.js';

// Dia 65: desktop-only in-app shortcuts (renderer-level keydown, not
// Electron's globalShortcut - a global OS-wide hotkey would steal these key
// combos from every other app on the user's machine, which is the opposite
// of "professional quality" for anything other than a genuine launcher).
// Gated behind isDesktop so the same shared React app never hijacks a
// regular browser's own Ctrl+K/L/P/R (search bar, address bar, print,
// reload) when running as the plain web app.
//
// Adapted from the plan's literal "Cmd+Space" for search: that's macOS's
// own reserved Spotlight shortcut system-wide, so using it here would just
// break Spotlight instead of doing anything useful in-app. Cmd/Ctrl+K is
// used instead (the standard "search" convention - Slack, GitHub, VS Code).
export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isDesktop) return undefined;

    function handleKeyDown(event) {
      if (!(event.metaKey || event.ctrlKey)) return;

      switch (event.key.toLowerCase()) {
        case 'k':
          event.preventDefault();
          navigate('/audiobooks', { state: { focusSearch: true } });
          break;
        case 'l':
          event.preventDefault();
          navigate('/audiobooks');
          break;
        case 'r':
          event.preventDefault();
          navigate('/flashcards');
          break;
        case 'p':
          event.preventDefault();
          // Decoupled from any specific page: AudioPlayer listens for this
          // itself, so the shortcut only does something when a player is
          // actually mounted (e.g. on PlayerPage) instead of this hook
          // needing to know about player internals.
          window.dispatchEvent(new CustomEvent('techspeak:toggle-playback'));
          break;
        case '/':
          event.preventDefault();
          window.dispatchEvent(new CustomEvent('techspeak:show-shortcuts-help'));
          break;
        default:
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
}
