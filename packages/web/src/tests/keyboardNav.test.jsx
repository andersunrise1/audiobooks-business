import { afterEach, describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../store/AuthContext.jsx';
import { ThemeProvider } from '../store/ThemeContext.jsx';
import ThemeSettings from '../components/features/ThemeSettings.jsx';
import Layout from '../components/layout/Layout.jsx';

function renderWithProviders(ui) {
  return render(
    <AuthProvider>
      <ThemeProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </ThemeProvider>
    </AuthProvider>,
  );
}

describe('ThemeSettings popover keyboard behavior (Dia 70)', () => {
  test('Escape closes the popover and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeSettings />);

    const trigger = screen.getByRole('button', { name: 'Personalizar tema' });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Cor principal')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Cor principal')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test('clicking outside closes the popover', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <div>
        <ThemeSettings />
        <p>outside</p>
      </div>,
    );

    await user.click(screen.getByRole('button', { name: 'Personalizar tema' }));
    expect(screen.getByText('Cor principal')).toBeInTheDocument();

    await user.click(screen.getByText('outside'));
    expect(screen.queryByText('Cor principal')).not.toBeInTheDocument();
  });
});

describe('Layout skip link (Dia 70)', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  test('lets keyboard users jump straight to main content', () => {
    renderWithProviders(<Layout />);

    const skipLink = screen.getByText('Pular para o conteúdo');
    expect(skipLink).toHaveAttribute('href', '#main-content');

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toHaveAttribute('tabIndex', '-1');
  });
});
