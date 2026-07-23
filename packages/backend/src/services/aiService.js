import Anthropic from '@anthropic-ai/sdk';

export const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'not-configured',
});

const SYSTEM_PROMPT =
  'Você é um professor de inglês técnico especializado em software. Respostas curtas e diretas.';

export async function explainTechnicalTerm(word, context) {
  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 150,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: `Explique a palavra "${word}" no contexto de: ${context}` },
    ],
  });

  return response.content.find((block) => block.type === 'text')?.text ?? '';
}
