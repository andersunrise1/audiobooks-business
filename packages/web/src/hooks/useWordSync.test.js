import { describe, expect, test } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWordSync } from './useWordSync.js';

const words = [
  { id: 'w1', start_seconds: 0, end_seconds: 1 },
  { id: 'w2', start_seconds: 1, end_seconds: 2.2 },
  { id: 'w3', start_seconds: 2.2, end_seconds: 3 },
];

describe('useWordSync', () => {
  test('returns the word active at the current time', () => {
    const { result } = renderHook(() => useWordSync(words, 1.5));
    expect(result.current).toBe('w2');
  });

  test('returns null when no word covers the current time', () => {
    const { result } = renderHook(() => useWordSync(words, 5));
    expect(result.current).toBeNull();
  });

  test('returns null for words missing timestamps', () => {
    const untimed = [{ id: 'w1', start_seconds: null, end_seconds: null }];
    const { result } = renderHook(() => useWordSync(untimed, 0));
    expect(result.current).toBeNull();
  });

  test('updates when currentTime changes', () => {
    const { result, rerender } = renderHook(({ time }) => useWordSync(words, time), {
      initialProps: { time: 0 },
    });
    expect(result.current).toBe('w1');

    rerender({ time: 2.5 });
    expect(result.current).toBe('w3');
  });
});
