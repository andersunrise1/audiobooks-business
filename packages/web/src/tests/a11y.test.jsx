import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../store/AuthContext.jsx';
import { ThemeProvider } from '../store/ThemeContext.jsx';
import HomePage from '../components/pages/HomePage.jsx';
import LoginPage from '../components/pages/LoginPage.jsx';
import RegisterPage from '../components/pages/RegisterPage.jsx';
import HelpCenterPage from '../components/pages/HelpCenterPage.jsx';
import AudiobookListPage from '../components/pages/AudiobookListPage.jsx';
import Navbar from '../components/layout/Navbar.jsx';

vi.mock('../services/api.js', () => ({
  API_URL: 'http://localhost:3000',
  apiRequest: vi.fn((path) => {
    if (path === '/api/audiobooks') {
      return Promise.resolve([
        { id: 'b1', title: 'Daily Standup', level: 'beginner', is_free: true },
        { id: 'b2', title: 'Architecture Decisions', level: 'advanced', is_free: false },
      ]);
    }
    return Promise.reject(new Error(`unexpected request: ${path}`));
  }),
}));

// Dia 70: a11y sweep, checked against jest-axe's default WCAG2A/AA ruleset.
// Deliberately scoped to jsdom-checkable rules (labels, roles, landmarks,
// list structure, etc.) - jest-axe/axe-core's color-contrast rule needs
// real layout/paint, which jsdom doesn't do, so contrast was audited
// separately with real axe-core against the live rendered app instead
// (see CLAUDE.md's Dia 70 entry).
function renderWithProviders(ui, { route = '/' } = {}) {
  return render(
    <AuthProvider>
      <ThemeProvider>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </ThemeProvider>
    </AuthProvider>,
  );
}

describe('Accessibility (jest-axe)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('HomePage has no violations', async () => {
    const { container } = renderWithProviders(<HomePage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  test('LoginPage has no violations', async () => {
    const { container } = renderWithProviders(<LoginPage />, { route: '/login' });
    expect(await axe(container)).toHaveNoViolations();
  });

  test('RegisterPage has no violations', async () => {
    const { container } = renderWithProviders(<RegisterPage />, { route: '/register' });
    expect(await axe(container)).toHaveNoViolations();
  });

  test('HelpCenterPage has no violations', async () => {
    const { container } = renderWithProviders(<HelpCenterPage />, { route: '/help' });
    expect(await axe(container)).toHaveNoViolations();
  });

  test('AudiobookListPage has no violations once loaded', async () => {
    const { container, findByText } = renderWithProviders(<AudiobookListPage />, {
      route: '/audiobooks',
    });
    await findByText('Daily Standup');
    expect(await axe(container)).toHaveNoViolations();
  });

  test('Navbar has no violations, logged out', async () => {
    const { container } = renderWithProviders(<Navbar />);
    expect(await axe(container)).toHaveNoViolations();
  });

  test('Navbar has no violations, logged in', async () => {
    localStorage.setItem(
      'techspeak_auth',
      JSON.stringify({
        user: { id: 'u1', email: 'ander@techspeaking.dev', name: 'Ander', plan: 'pro' },
        accessToken: 'fake-token',
      }),
    );
    const { container } = renderWithProviders(<Navbar />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
