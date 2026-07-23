import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatCard from './StatCard.jsx';

describe('StatCard', () => {
  test('renders the label and value', () => {
    render(<StatCard label="Streak" value="3 dia(s)" />);
    expect(screen.getByText('Streak')).toBeInTheDocument();
    expect(screen.getByText('3 dia(s)')).toBeInTheDocument();
  });

  test('renders the hint when provided', () => {
    render(<StatCard label="Palavras hoje" value={2} hint="10 nesta semana" />);
    expect(screen.getByText('10 nesta semana')).toBeInTheDocument();
  });

  test('omits the hint when not provided', () => {
    render(<StatCard label="Streak" value="1 dia(s)" />);
    expect(screen.queryByText(/nesta semana/)).not.toBeInTheDocument();
  });
});
