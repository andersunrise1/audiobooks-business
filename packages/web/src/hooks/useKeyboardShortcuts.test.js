import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// isDesktop (services/desktopBridge.js) is `Boolean(window.techspeak)`,
// evaluated once at module import - toggle window.techspeak and re-import
// with vi.resetModules() so each test gets a fresh isDesktop value instead
// of the first-imported one.
async function loadHookWithDesktop(isDesktopEnabled) {
  vi.resetModules();
  if (isDesktopEnabled) {
    window.techspeak = {};
  } else {
    delete window.techspeak;
  }
  const { useKeyboardShortcuts } = await import('./useKeyboardShortcuts.js');
  return useKeyboardShortcuts;
}

function fireShortcut(key) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, ctrlKey: true, bubbles: true }));
}

describe('useKeyboardShortcuts', () => {
  afterEach(() => {
    delete window.techspeak;
  });

  test('does nothing outside the desktop app', async () => {
    const useKeyboardShortcuts = await loadHookWithDesktop(false);
    const navigate = vi.fn();
    vi.doMock('react-router-dom', async (importOriginal) => ({
      ...(await importOriginal()),
      useNavigate: () => navigate,
    }));

    renderHook(() => useKeyboardShortcuts(), { wrapper: MemoryRouter });
    fireShortcut('l');
    expect(navigate).not.toHaveBeenCalled();
    vi.doUnmock('react-router-dom');
  });

  describe('inside the desktop app', () => {
    let navigate;

    beforeEach(async () => {
      navigate = vi.fn();
      vi.doMock('react-router-dom', async (importOriginal) => ({
        ...(await importOriginal()),
        useNavigate: () => navigate,
      }));
    });

    afterEach(() => {
      vi.doUnmock('react-router-dom');
    });

    test('Ctrl+L navigates to the library', async () => {
      const useKeyboardShortcuts = await loadHookWithDesktop(true);
      renderHook(() => useKeyboardShortcuts(), { wrapper: MemoryRouter });

      fireShortcut('l');
      expect(navigate).toHaveBeenCalledWith('/audiobooks');
    });

    test('Ctrl+K navigates to the library with focusSearch state', async () => {
      const useKeyboardShortcuts = await loadHookWithDesktop(true);
      renderHook(() => useKeyboardShortcuts(), { wrapper: MemoryRouter });

      fireShortcut('k');
      expect(navigate).toHaveBeenCalledWith('/audiobooks', { state: { focusSearch: true } });
    });

    test('Ctrl+R navigates to flashcards', async () => {
      const useKeyboardShortcuts = await loadHookWithDesktop(true);
      renderHook(() => useKeyboardShortcuts(), { wrapper: MemoryRouter });

      fireShortcut('r');
      expect(navigate).toHaveBeenCalledWith('/flashcards');
    });

    test('Ctrl+P dispatches a toggle-playback event', async () => {
      const useKeyboardShortcuts = await loadHookWithDesktop(true);
      renderHook(() => useKeyboardShortcuts(), { wrapper: MemoryRouter });

      const handler = vi.fn();
      window.addEventListener('techspeak:toggle-playback', handler);
      fireShortcut('p');
      expect(handler).toHaveBeenCalledOnce();
      window.removeEventListener('techspeak:toggle-playback', handler);
    });

    test('Ctrl+/ dispatches a show-shortcuts-help event', async () => {
      const useKeyboardShortcuts = await loadHookWithDesktop(true);
      renderHook(() => useKeyboardShortcuts(), { wrapper: MemoryRouter });

      const handler = vi.fn();
      window.addEventListener('techspeak:show-shortcuts-help', handler);
      fireShortcut('/');
      expect(handler).toHaveBeenCalledOnce();
      window.removeEventListener('techspeak:show-shortcuts-help', handler);
    });
  });
});
