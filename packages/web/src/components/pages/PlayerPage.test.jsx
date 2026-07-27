import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../store/AuthContext.jsx';
import PlayerPage from './PlayerPage.jsx';
import { apiRequest } from '../../services/api.js';

vi.mock('../../services/api.js', () => ({
  API_URL: 'http://localhost:3000',
  apiRequest: vi.fn((path) => {
    if (path === '/api/audiobooks/b1/chapters') {
      return Promise.resolve([
        {
          id: 'c1',
          title: 'Opening',
          audio_url: 'https://example.com/audio.mp3',
          transcript: 'We deployed it.',
        },
      ]);
    }
    if (path === '/api/user/progress') {
      return Promise.resolve([]);
    }
    if (path === '/api/audiobooks/chapters/c1/words') {
      return Promise.resolve([
        {
          id: 'w1',
          word: 'deployed',
          portuguese_translation: 'implantei',
          start_seconds: 0,
          end_seconds: 1,
        },
      ]);
    }
    if (path === '/api/user/words-learned') {
      return Promise.resolve({ chapter_id: 'c1', words_learned: 1 });
    }
    return Promise.reject(new Error(`unexpected request: ${path}`));
  }),
}));

function renderPlayerPage() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/audiobooks/b1/player']}>
        <Routes>
          <Route path="/audiobooks/:id/player" element={<PlayerPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('PlayerPage', () => {
  beforeEach(() => {
    localStorage.setItem(
      'techspeak_auth',
      JSON.stringify({ user: { id: 'u1', name: 'Test' }, accessToken: 'fake-token' }),
    );
  });

  test('renders the chapter and its transcript', async () => {
    renderPlayerPage();
    expect(await screen.findByText('Opening')).toBeInTheDocument();
    // Query by role, not text: before the words fetch resolves, "deployed"
    // briefly renders as plain (non-clickable) text too, since it's just
    // another token in the transcript until a tagged word matches it.
    expect(await screen.findByRole('button', { name: 'deployed' })).toBeInTheDocument();
  });

  test('clicking a word saves it and shows the translation popup', async () => {
    const user = userEvent.setup();
    renderPlayerPage();

    const wordEl = await screen.findByRole('button', { name: 'deployed' });
    await user.click(wordEl);

    expect(await screen.findByText('implantei')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith(
      '/api/user/words-learned',
      expect.objectContaining({ body: { chapterId: 'c1', wordId: 'w1' } }),
    );
  });
});

describe('PlayerPage without an account (Dia 59-60)', () => {
  test('plays a free audiobook and shows an account CTA instead of chat/voice/progress', async () => {
    const user = userEvent.setup();
    localStorage.removeItem('techspeak_auth');
    // apiRequest is a shared module-level mock across every test in this
    // file - scope the "not called" assertion below to calls made from this
    // point on, not the whole test file's accumulated call history.
    const callsBefore = apiRequest.mock.calls.length;
    renderPlayerPage();

    expect(await screen.findByText('Opening')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Criar conta' })).toBeInTheDocument();
    expect(screen.queryByText('Chat com o tutor')).not.toBeInTheDocument();

    const wordEl = await screen.findByRole('button', { name: 'deployed' });
    await user.click(wordEl);

    // Translation popup still shows for an anonymous visitor (client-side,
    // independent of the account-only words-learned save below).
    expect(await screen.findByText('implantei')).toBeInTheDocument();
    const callsDuringTest = apiRequest.mock.calls.slice(callsBefore);
    expect(callsDuringTest.some(([path]) => path === '/api/user/words-learned')).toBe(false);
  });
});
