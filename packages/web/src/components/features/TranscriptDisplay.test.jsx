import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TranscriptDisplay from './TranscriptDisplay.jsx';

const words = [
  { id: 'w1', word: 'Yesterday', start_seconds: 0, end_seconds: 1 },
  {
    id: 'w2',
    word: 'deployed',
    start_seconds: 1,
    end_seconds: 2,
    portuguese_translation: 'implantei',
  },
];

describe('TranscriptDisplay', () => {
  test('renders every word', () => {
    render(<TranscriptDisplay words={words} activeWordId={null} transcript="" />);
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
    expect(screen.getByText('deployed')).toBeInTheDocument();
  });

  test('highlights the active word', () => {
    render(<TranscriptDisplay words={words} activeWordId="w2" transcript="" />);
    expect(screen.getByText('deployed')).toHaveClass('bg-yellow-200');
    expect(screen.getByText('Yesterday')).not.toHaveClass('bg-yellow-200');
  });

  test('clicking a word calls onWordClick and opens the translation popup', async () => {
    const onWordClick = vi.fn();
    const user = userEvent.setup();

    render(
      <TranscriptDisplay
        words={words}
        activeWordId={null}
        transcript=""
        onWordClick={onWordClick}
      />,
    );

    await user.click(screen.getByText('deployed'));

    expect(onWordClick).toHaveBeenCalledWith(words[1]);
    expect(screen.getByText('implantei')).toBeInTheDocument();
  });

  test('falls back to plain transcript text when there are no timestamped words', () => {
    render(<TranscriptDisplay words={[]} activeWordId={null} transcript="Yesterday I deployed." />);
    expect(screen.getByText('Yesterday I deployed.')).toBeInTheDocument();
  });
});
