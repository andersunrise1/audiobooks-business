import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NarrationPlayer from './NarrationPlayer.jsx';

const FEMALE_VOICE = { name: 'Microsoft Maria - Portuguese (Brazil)', lang: 'pt-BR' };
const MALE_VOICE = { name: 'Microsoft Daniel - Portuguese (Brazil)', lang: 'pt-BR' };

function mockSpeechSynthesis(voices) {
  window.speechSynthesis = {
    getVoices: () => voices,
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    speaking: false,
    paused: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  window.SpeechSynthesisUtterance = vi.fn().mockImplementation(function (text) {
    this.text = text;
  });
}

describe('NarrationPlayer', () => {
  afterEach(() => {
    // Unmount while the speechSynthesis mock still exists - otherwise
    // NarrationPlayer's own unmount effect (which calls
    // window.speechSynthesis.cancel()) runs after the mock is deleted
    // below and throws.
    cleanup();
    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
    localStorage.clear();
  });

  test('shows a not-supported message when the browser lacks speechSynthesis', () => {
    delete window.speechSynthesis;
    render(<NarrationPlayer text="Hello there." />);
    expect(screen.getByText(/não é suportada neste navegador/)).toBeInTheDocument();
  });

  test('speaks the chapter text using the preferred gender voice on play', async () => {
    mockSpeechSynthesis([MALE_VOICE, FEMALE_VOICE]);
    const user = userEvent.setup();

    render(<NarrationPlayer text="Hello there." />);

    await user.click(screen.getByRole('button', { name: 'Ouvir narração' }));

    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    const utterance = window.speechSynthesis.speak.mock.calls[0][0];
    expect(utterance.text).toBe('Hello there.');
    // Default preference is 'female' - "Maria" is a real Windows SAPI voice
    // caught during live testing where the original name-based heuristic
    // didn't recognize it, wrongly falling back to the male voice.
    expect(utterance.voice).toEqual(FEMALE_VOICE);
  });

  test('switching to the male voice picks a male-classified voice on the next play', async () => {
    mockSpeechSynthesis([MALE_VOICE, FEMALE_VOICE]);
    const user = userEvent.setup();

    render(<NarrationPlayer text="Hello there." />);

    await user.click(screen.getByRole('button', { name: 'Voz masculina' }));
    await user.click(screen.getByRole('button', { name: 'Ouvir narração' }));

    const utterance = window.speechSynthesis.speak.mock.calls[0][0];
    expect(utterance.voice).toEqual(MALE_VOICE);
  });

  test('stop cancels speech synthesis', async () => {
    mockSpeechSynthesis([MALE_VOICE, FEMALE_VOICE]);
    const user = userEvent.setup();

    render(<NarrationPlayer text="Hello there." />);

    await user.click(screen.getByRole('button', { name: 'Ouvir narração' }));
    await user.click(screen.getByRole('button', { name: 'Parar narração' }));

    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });
});
