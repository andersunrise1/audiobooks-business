// Live-API latency benchmark - same "not auto-discovered" reasoning as
// aiResponseQuality.js. Run explicitly via `npm run test:ai-quality`.
// The threshold is a generous ceiling ("did this hang/break"), not a
// tight SLA - actual measured latency is logged for each call.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  explainTechnicalTerm,
  chatReply,
  getRemedialContent,
} from '../../src/services/aiService.js';

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
const skip = hasKey ? false : 'ANTHROPIC_API_KEY not configured';
const MAX_LATENCY_MS = 15000;

async function timed(label, fn) {
  const start = Date.now();
  await fn();
  const elapsed = Date.now() - start;
  console.log(`  [latency] ${label}: ${elapsed}ms`);
  return elapsed;
}

describe('AI latency benchmark (live Anthropic API)', { skip }, () => {
  test('explainTechnicalTerm responds within a reasonable time', async () => {
    const elapsed = await timed('explainTechnicalTerm', () =>
      explainTechnicalTerm('rollback', 'We had to rollback the deployment.'),
    );
    assert.ok(elapsed < MAX_LATENCY_MS, `expected under ${MAX_LATENCY_MS}ms, got ${elapsed}ms`);
  });

  test('chatReply responds within a reasonable time', async () => {
    const elapsed = await timed('chatReply', () =>
      chatReply([{ role: 'user', content: 'What is CI/CD?' }]),
    );
    assert.ok(elapsed < MAX_LATENCY_MS, `expected under ${MAX_LATENCY_MS}ms, got ${elapsed}ms`);
  });

  test('getRemedialContent responds within a reasonable time', async () => {
    const elapsed = await timed('getRemedialContent', () =>
      getRemedialContent('The team deployed a hotfix after the incident was resolved.'),
    );
    assert.ok(elapsed < MAX_LATENCY_MS, `expected under ${MAX_LATENCY_MS}ms, got ${elapsed}ms`);
  });
});
