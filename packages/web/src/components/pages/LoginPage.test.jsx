import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../store/AuthContext.jsx';
import LoginPage from './LoginPage.jsx';

vi.mock('../../services/api.js', () => ({
  API_URL: 'http://localhost:3000',
  apiRequest: vi.fn((path, options) => {
    if (path === '/api/auth/login') {
      const { email, password } = options.body;
      if (email === 'ander@techspeaking.dev' && password === 'senha123') {
        return Promise.resolve({
          user: { id: 'u1', email, name: 'Ander' },
          accessToken: 'fake-token',
        });
      }
      return Promise.reject(new Error('invalid credentials'));
    }
    return Promise.reject(new Error(`unexpected request: ${path}`));
  }),
}));

function DashboardStub() {
  const { user } = useAuth();
  return <p>Bem-vindo, {user?.name}</p>;
}

function renderApp() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardStub />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('Login flow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('logs in with valid credentials and redirects to the dashboard', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByPlaceholderText('Email'), 'ander@techspeaking.dev');
    await user.type(screen.getByPlaceholderText('Senha'), 'senha123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Bem-vindo, Ander')).toBeInTheDocument();
  });

  test('shows an error message on invalid credentials', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByPlaceholderText('Email'), 'wrong@techspeaking.dev');
    await user.type(screen.getByPlaceholderText('Senha'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('invalid credentials')).toBeInTheDocument();
  });
});
