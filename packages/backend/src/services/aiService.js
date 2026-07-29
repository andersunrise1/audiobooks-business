import Anthropic from '@anthropic-ai/sdk';
import { pool } from '../config/database.js';
import { hashKey, deleteCache } from './cacheService.js';
import { logAiUsage } from './costTrackingService.js';

export const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'not-configured',
});

export const AI_NOT_CONFIGURED_ERROR = 'AI service is not configured (missing ANTHROPIC_API_KEY)';

export function isAiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// explain is short, high-volume and cacheable - the best candidate to try a
// cheaper/faster model on (Dia 37 cost optimization). chat and remedial stay
// on the stronger model since they carry more reasoning (conversation
// history, structured JSON output).
const EXPLAIN_MODEL = 'claude-haiku-4-5';
const DEFAULT_MODEL = 'claude-sonnet-5';

async function createMessage(params) {
  const start = Date.now();
  const response = await client.messages.create(params);
  return { response, responseTimeMs: Date.now() - start };
}

async function logUsage(endpoint, model, response, userId, responseTimeMs) {
  if (!userId || !response.usage) return;
  await logAiUsage({
    userId,
    endpoint,
    model,
    inputTokens: response.usage.input_tokens ?? 0,
    outputTokens: response.usage.output_tokens ?? 0,
    responseTimeMs,
  });
}

// Claude sometimes wraps a JSON response in a ```json ... ``` fence despite
// the system prompt explicitly asking for none (observed live from
// translateAnyWord using the Haiku model) - strip it before JSON.parse
// instead of letting a well-formed-but-fenced response fall through to the
// "not valid JSON" fallback path.
function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced ? fenced[1] : text;
}

export function explainCacheKey(word, context) {
  return `ai:explain:${word.toLowerCase()}:${hashKey(context)}`;
}

export function remedialCacheKey(chapterId) {
  return `ai:remedial:${chapterId}`;
}

export async function invalidateExplainCache(word, context) {
  await deleteCache(explainCacheKey(word, context));
}

export async function invalidateRemedialCache(chapterId) {
  await deleteCache(remedialCacheKey(chapterId));
}

const SYSTEM_PROMPT =
  'Você é um professor de inglês técnico especializado em software, respondendo dentro de um popup pequeno no app. ' +
  'Responda em texto simples, sem markdown (sem #, sem **, sem listas), em no máximo 2 frases curtas. ' +
  'Vá direto à explicação, sem saudação ou introdução.';

export async function explainTechnicalTerm(word, context, { userId, endpoint = 'explain' } = {}) {
  const { response, responseTimeMs } = await createMessage({
    model: EXPLAIN_MODEL,
    max_tokens: 150,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: `Explique a palavra "${word}" no contexto de: ${context}` },
    ],
  });

  await logUsage(endpoint, EXPLAIN_MODEL, response, userId, responseTimeMs);

  return response.content.find((block) => block.type === 'text')?.text ?? '';
}

// Dia [current]: click-any-word-to-translate (not just curated technical
// vocabulary) - the user asked for every word in a chapter to be clickable,
// matching a reference reading app. There's no comprehensive EN-PT
// dictionary in this project, only ~90 curated technical_dictionary
// entries, so any word outside that set needs to be generated on demand.
// Runs on the cheap/fast model (same tier as explainTechnicalTerm) since
// this is a short, high-volume, cacheable call - callers should check
// technical_dictionary first and only reach this for a real miss.
const TRANSLATE_SYSTEM_PROMPT =
  'Você é um dicionário de inglês para falantes de português. ' +
  'Responda APENAS com um JSON valido (sem markdown, sem texto fora do JSON), no formato: ' +
  '{"part_of_speech": "classe gramatical em portugues (substantivo, verbo, adjetivo, etc)", ' +
  '"portuguese_translation": "traducao curta para portugues", ' +
  '"technical_explanation": "explicacao breve em portugues, 1 frase, usando o contexto dado", ' +
  '"example_sentence": "a frase de contexto original, sem alteracoes"}.';

export async function translateAnyWord(word, context, { userId } = {}) {
  const { response, responseTimeMs } = await createMessage({
    model: EXPLAIN_MODEL,
    max_tokens: 200,
    system: TRANSLATE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Palavra: "${word}"\nFrase de contexto: "${context}"` }],
  });

  await logUsage('translate', EXPLAIN_MODEL, response, userId, responseTimeMs);

  const text = response.content.find((block) => block.type === 'text')?.text ?? '';

  try {
    const parsed = JSON.parse(extractJson(text));
    return {
      part_of_speech: parsed.part_of_speech ?? null,
      portuguese_translation: parsed.portuguese_translation ?? null,
      technical_explanation: parsed.technical_explanation ?? null,
      example_sentence: parsed.example_sentence ?? context,
    };
  } catch {
    return {
      part_of_speech: null,
      portuguese_translation: text || null,
      technical_explanation: null,
      example_sentence: context,
    };
  }
}

const REMEDIAL_SYSTEM_PROMPT =
  'Você é um tutor de inglês técnico. O aluno terminou um capítulo e disse que não entendeu. ' +
  'Responda APENAS com um JSON valido (sem markdown, sem texto fora do JSON), no formato: ' +
  '{"summary": "resumo em portugues em 2-3 frases", "keywords": ["ate 5 palavras-chave em ingles do capitulo"], "exercise": "um exercicio curto de pratica em ingles relacionado ao capitulo"}.';

export async function getRemedialContent(transcript, { userId } = {}) {
  const { response, responseTimeMs } = await createMessage({
    model: DEFAULT_MODEL,
    max_tokens: 400,
    system: REMEDIAL_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Transcript do capitulo: "${transcript}"` }],
  });

  await logUsage('remedial', DEFAULT_MODEL, response, userId, responseTimeMs);

  const text = response.content.find((block) => block.type === 'text')?.text ?? '';

  try {
    const parsed = JSON.parse(extractJson(text));
    return {
      summary: parsed.summary ?? '',
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      exercise: parsed.exercise ?? '',
    };
  } catch {
    return { summary: text, keywords: [], exercise: '' };
  }
}

const CHAT_SYSTEM_PROMPT =
  'Você é um tutor de inglês técnico para profissionais de TI, conversando em um chat dentro do app. ' +
  'Responda em texto simples, sem markdown, de forma clara e direta. Vá direto ao ponto, sem saudação.';

export async function buildChatContext(chapterId, wordId) {
  const parts = [];

  if (chapterId) {
    const { rows } = await pool.query('SELECT title, transcript FROM chapters WHERE id = $1', [
      chapterId,
    ]);
    const chapter = rows[0];
    if (chapter) {
      parts.push(
        `Capitulo atual: "${chapter.title}".${chapter.transcript ? ` Transcript: "${chapter.transcript}"` : ''}`,
      );
    }
  }

  if (wordId) {
    const { rows } = await pool.query(
      'SELECT word, portuguese_translation, technical_explanation FROM words WHERE id = $1',
      [wordId],
    );
    const word = rows[0];
    if (word) {
      parts.push(
        `Palavra em foco: "${word.word}" (traducao: ${word.portuguese_translation || 'desconhecida'}).` +
          (word.technical_explanation ? ` ${word.technical_explanation}` : ''),
      );
    }
  }

  return parts.join('\n');
}

export async function chatReply(messages, context, { userId } = {}) {
  const system = context
    ? `${CHAT_SYSTEM_PROMPT}\n\nContexto do que o aluno esta estudando agora:\n${context}`
    : CHAT_SYSTEM_PROMPT;

  const { response, responseTimeMs } = await createMessage({
    model: DEFAULT_MODEL,
    max_tokens: 500,
    system,
    messages: messages.map(({ role, content }) => ({ role, content })),
  });

  await logUsage('chat', DEFAULT_MODEL, response, userId, responseTimeMs);

  return response.content.find((block) => block.type === 'text')?.text ?? '';
}
