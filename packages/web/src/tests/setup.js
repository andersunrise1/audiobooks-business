import '@testing-library/jest-dom/vitest';
import { expect, vi } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// jsdom doesn't implement matchMedia - ThemeContext.jsx reads it for the
// "system" light/dark preference (Dia 66-67), so any test rendering
// ThemeProvider needs this polyfilled.
window.matchMedia =
  window.matchMedia ||
  vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
