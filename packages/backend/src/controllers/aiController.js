import {
  explainTechnicalTerm,
  translateAnyWord,
  chatReply,
  buildChatContext,
  getRemedialContent,
  explainCacheKey,
  remedialCacheKey,
  isAiConfigured,
  AI_NOT_CONFIGURED_ERROR,
} from '../services/aiService.js';
import { getCache, setCache } from '../services/cacheService.js';
import {
  getExplainFallback,
  getChatFallback,
  getRemedialFallback,
} from '../services/aiFallbackService.js';
import { lookupWord, insertDictionaryEntry } from '../services/technicalDictionaryService.js';
import { pool } from '../config/database.js';

export async function explainWord(req, res) {
  const { word, context } = req.body;

  if (!word || !context) {
    return res.status(400).json({ error: 'word and context are required' });
  }

  const cacheKey = explainCacheKey(word, context);
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.json({ word, explanation: cached.explanation, cached: true });
  }

  if (!isAiConfigured()) {
    return res.status(503).json({ error: AI_NOT_CONFIGURED_ERROR });
  }

  try {
    const explanation = await explainTechnicalTerm(word, context, { userId: req.user.id });
    await setCache(cacheKey, { explanation });
    res.json({ word, explanation });
  } catch (err) {
    console.error('AI explain call failed, serving fallback:', err.message);
    res.json(await getExplainFallback(word));
  }
}

// Inserts a new words row for a resolved (word, chapter) pair, or returns
// the existing one if a concurrent request already won the race - the
// `words_chapter_id_lower_word_key` unique index (migration 045) is what
// makes ON CONFLICT possible here; without it, two near-simultaneous
// requests for the same untagged word could both pass translateWord's
// earlier "does it already exist" check and both insert, which is exactly
// what produced a real duplicate row for "Jordan" during live testing.
async function insertWordOrGetExisting(word, chapterId, entry) {
  const { rows } = await pool.query(
    `INSERT INTO words (word, chapter_id, portuguese_translation, technical_explanation, example_sentence)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (chapter_id, lower(word)) DO NOTHING
     RETURNING id, word, pronunciation, portuguese_translation, technical_explanation, example_sentence`,
    [
      word,
      chapterId,
      entry.portuguese_translation,
      entry.technical_explanation,
      entry.example_sentence,
    ],
  );
  if (rows.length > 0) return rows[0];

  const { rows: existing } = await pool.query(
    `SELECT id, word, pronunciation, portuguese_translation, technical_explanation, example_sentence
     FROM words WHERE lower(word) = lower($1) AND chapter_id = $2`,
    [word, chapterId],
  );
  return existing[0];
}

// Dia [current]: click-any-word-to-translate. Unlike explainWord (a
// freeform-text explanation of an already-known technical term),
// translateWord's job is to resolve *any* word in a chapter's transcript
// to a real `words` row - creating one if it doesn't exist yet - so the
// existing words-learned/flashcard/progress flow (unchanged) can use it
// exactly like a pre-tagged word. Three tiers, cheapest first: an existing
// `words` row for this exact (word, chapter) > the shared
// technical_dictionary > a live AI call, which also seeds
// technical_dictionary so future chapters get a free hit.
export async function translateWord(req, res) {
  const { word, context, chapterId } = req.body;

  if (!word || !context || !chapterId) {
    return res.status(400).json({ error: 'word, context, and chapterId are required' });
  }

  const { rows: existingRows } = await pool.query(
    `SELECT id, word, pronunciation, portuguese_translation, technical_explanation, example_sentence
     FROM words WHERE lower(word) = lower($1) AND chapter_id = $2`,
    [word, chapterId],
  );
  if (existingRows.length > 0) {
    return res.json(existingRows[0]);
  }

  const dictionaryEntry = await lookupWord(word);
  if (dictionaryEntry) {
    const row = await insertWordOrGetExisting(word, chapterId, dictionaryEntry);
    return res.json({ ...row, part_of_speech: dictionaryEntry.part_of_speech });
  }

  if (!isAiConfigured()) {
    return res.status(503).json({ error: AI_NOT_CONFIGURED_ERROR });
  }

  try {
    const translated = await translateAnyWord(word, context, { userId: req.user.id });

    await insertDictionaryEntry({
      word,
      partOfSpeech: translated.part_of_speech,
      portugueseTranslation: translated.portuguese_translation,
      technicalExplanation: translated.technical_explanation,
      exampleSentence: translated.example_sentence,
    });

    const row = await insertWordOrGetExisting(word, chapterId, translated);
    res.json({ ...row, part_of_speech: translated.part_of_speech });
  } catch (err) {
    console.error('AI translate call failed:', err.message);
    res.status(502).json({ error: 'translation temporarily unavailable' });
  }
}

export async function chat(req, res) {
  const { messages, chapterId, wordId } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  if (!isAiConfigured()) {
    return res.status(503).json({ error: AI_NOT_CONFIGURED_ERROR });
  }

  const context = await buildChatContext(chapterId, wordId);

  let reply;
  try {
    reply = await chatReply(messages, context, { userId: req.user.id });
  } catch (err) {
    console.error('AI chat call failed, serving fallback:', err.message);
    // Not persisted to chat_messages - a fallback reply isn't a real tutor
    // turn and would pollute the Dia 38 analytics (questions/satisfaction).
    return res.json(getChatFallback());
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const { rows } = await pool.query(
    `INSERT INTO chat_messages (user_id, chapter_id, message, response, message_type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      req.user.id,
      chapterId || null,
      lastUserMessage?.content ?? '',
      reply,
      wordId ? 'vocabulary' : null,
    ],
  );

  res.json({ reply, messageId: rows[0].id });
}

const FEEDBACK_VALUES = [null, 'helpful', 'not_helpful'];

export async function updateChatFeedback(req, res) {
  const { messageId } = req.params;
  const { feedback } = req.body;

  if (!FEEDBACK_VALUES.includes(feedback)) {
    return res.status(400).json({ error: 'feedback must be "helpful", "not_helpful", or null' });
  }

  const { rows } = await pool.query(
    `UPDATE chat_messages SET feedback = $1 WHERE id = $2 AND user_id = $3 RETURNING id, feedback`,
    [feedback, messageId, req.user.id],
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'chat message not found' });
  }

  res.json(rows[0]);
}

export async function remedial(req, res) {
  const { chapterId } = req.body;

  if (!chapterId) {
    return res.status(400).json({ error: 'chapterId is required' });
  }

  const cacheKey = remedialCacheKey(chapterId);
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  const { rows } = await pool.query('SELECT transcript FROM chapters WHERE id = $1', [chapterId]);
  const chapter = rows[0];

  if (!chapter) {
    return res.status(404).json({ error: 'chapter not found' });
  }

  if (!chapter.transcript) {
    return res.status(422).json({ error: 'chapter has no transcript to summarize' });
  }

  if (!isAiConfigured()) {
    return res.status(503).json({ error: AI_NOT_CONFIGURED_ERROR });
  }

  try {
    const content = await getRemedialContent(chapter.transcript, { userId: req.user.id });
    await setCache(cacheKey, content);
    res.json(content);
  } catch (err) {
    console.error('AI remedial call failed, serving fallback:', err.message);
    res.json(getRemedialFallback());
  }
}
