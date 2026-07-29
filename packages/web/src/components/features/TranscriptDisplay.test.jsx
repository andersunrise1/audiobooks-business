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

const transcript = 'Yesterday I deployed a new version.';

describe('TranscriptDisplay', () => {
  test('renders every tagged word', () => {
    render(<TranscriptDisplay words={words} activeWordId={null} transcript={transcript} />);
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
    expect(screen.getByText('deployed')).toBeInTheDocument();
  });

  test('highlights the active word', () => {
    render(<TranscriptDisplay words={words} activeWordId="w2" transcript={transcript} />);
    expect(screen.getByText('deployed')).toHaveClass('bg-primary');
    expect(screen.getByText('Yesterday')).not.toHaveClass('bg-primary');
  });

  test('clicking a word calls onWordClick and opens the translation popup', async () => {
    const onWordClick = vi.fn();
    const user = userEvent.setup();

    render(
      <TranscriptDisplay
        words={words}
        activeWordId={null}
        transcript={transcript}
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

  test('keeps the full sentence visible when only some words are tagged', () => {
    // The sentence is split across multiple <span> elements (one per
    // matched/unmatched token), so getByText(fullSentence) can't find it -
    // that's a testing-library limitation for text split across elements,
    // not a real gap. Assert on the rendered container text instead.
    const partialWords = [{ id: 'w2', word: 'deployed', portuguese_translation: 'implantei' }];
    const { container } = render(
      <TranscriptDisplay words={partialWords} activeWordId={null} transcript={transcript} />,
    );
    expect(container.textContent).toBe(transcript);
    expect(screen.getByRole('button', { name: 'deployed' })).toBeInTheDocument();
  });

  test('treats a multi-word tagged term as a single clickable segment', async () => {
    const user = userEvent.setup();
    const onWordClick = vi.fn();
    const prTranscript = 'I opened a pull request for review.';
    const prWords = [
      { id: 'w3', word: 'pull request', portuguese_translation: 'pedido de incorporacao' },
    ];

    const { container } = render(
      <TranscriptDisplay
        words={prWords}
        activeWordId={null}
        transcript={prTranscript}
        onWordClick={onWordClick}
      />,
    );

    expect(container.textContent).toBe(prTranscript);
    await user.click(screen.getByRole('button', { name: 'pull request' }));
    expect(onWordClick).toHaveBeenCalledWith(prWords[0]);
  });
});
