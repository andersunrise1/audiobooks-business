import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { transcribeAudio, prerecordedClient } from '../../src/services/deepgramService.js';

describe('deepgramService.transcribeAudio', () => {
  test('returns the transcript from the first channel/alternative', async () => {
    const transcribeMock = mock.method(prerecordedClient, 'transcribeFile', async () => ({
      result: {
        results: {
          channels: [{ alternatives: [{ transcript: 'we need to optimize the query' }] }],
        },
      },
      error: null,
    }));

    try {
      const transcript = await transcribeAudio(Buffer.from('fake-audio'), 'audio/webm');
      assert.equal(transcript, 'we need to optimize the query');

      const [buffer, options] = transcribeMock.mock.calls[0].arguments;
      assert.ok(Buffer.isBuffer(buffer));
      assert.equal(options.mimetype, 'audio/webm');
    } finally {
      transcribeMock.mock.restore();
    }
  });

  test('returns an empty string when there is no alternative', async () => {
    const transcribeMock = mock.method(prerecordedClient, 'transcribeFile', async () => ({
      result: { results: { channels: [] } },
      error: null,
    }));

    try {
      const transcript = await transcribeAudio(Buffer.from('fake-audio'), 'audio/webm');
      assert.equal(transcript, '');
    } finally {
      transcribeMock.mock.restore();
    }
  });

  test('throws when Deepgram returns an error', async () => {
    const transcribeMock = mock.method(prerecordedClient, 'transcribeFile', async () => ({
      result: null,
      error: new Error('invalid API key'),
    }));

    try {
      await assert.rejects(
        () => transcribeAudio(Buffer.from('fake-audio'), 'audio/webm'),
        /invalid API key/,
      );
    } finally {
      transcribeMock.mock.restore();
    }
  });
});
