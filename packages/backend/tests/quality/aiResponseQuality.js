// Live-API quality checks against the real Anthropic API - deliberately
// named without ".test.js" so `node --test` (no arguments, used by the
// default `npm test`) does NOT auto-discover and run them on every commit,
// which would spend real money. Run explicitly via `npm run test:ai-quality`.
// Skips entirely when ANTHROPIC_API_KEY isn't configured (e.g. in CI).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  explainTechnicalTerm,
  chatReply,
  getRemedialContent,
} from '../../src/services/aiService.js';

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
const skip = hasKey ? false : 'ANTHROPIC_API_KEY not configured';

describe('AI response quality (live Anthropic API)', { skip }, () => {
  test('explainTechnicalTerm: mentions the word, avoids markdown, stays concise', async () => {
    const explanation = await explainTechnicalTerm(
      'deployed',
      'We deployed the new version to production yesterday.',
    );

    assert.ok(explanation.length > 0, 'explanation should not be empty');
    assert.match(explanation.toLowerCase(), /deploy/, 'should reference the word being explained');
    assert.doesNotMatch(explanation, /[#*_`]/, 'should not use markdown formatting');
    assert.ok(
      explanation.length < 500,
      `expected a concise popup explanation, got ${explanation.length} chars`,
    );
  });

  test('chatReply: answers the question without heavy markdown', async () => {
    const reply = await chatReply([
      { role: 'user', content: 'What does "rollback" mean in software deployment?' },
    ]);

    assert.ok(reply.length > 0, 'reply should not be empty');
    assert.match(
      reply.toLowerCase(),
      /rollback|revert|previous|undo/,
      'should address the question',
    );
    assert.doesNotMatch(reply, /^#{1,6}\s|\*\*.+\*\*/, 'should avoid markdown headings/bold');
  });

  test('getRemedialContent: returns well-formed structured content', async () => {
    const content = await getRemedialContent(
      'Yesterday I deployed a new version of the application to fix three critical bugs.',
    );

    assert.ok(content.summary.length > 0, 'summary should not be empty');
    assert.ok(
      Array.isArray(content.keywords) && content.keywords.length > 0,
      'should suggest keywords',
    );
    assert.ok(content.exercise.length > 0, 'exercise should not be empty');
  });
});
