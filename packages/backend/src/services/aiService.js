import Anthropic from '@anthropic-ai/sdk';

export const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'not-configured',
});

const SYSTEM_PROMPT =
  'Você é um professor de inglês técnico especializado em software, respondendo dentro de um popup pequeno no app. ' +
  'Responda em texto simples, sem markdown (sem #, sem **, sem listas), em no máximo 2 frases curtas.';

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

const CHAT_SYSTEM_PROMPT =
  'Você é um tutor de inglês técnico para profissionais de TI, conversando em um chat dentro do app. ' +
  'Responda em texto simples, sem markdown, de forma clara e direta.';

export async function chatReply(messages) {
  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 500,
    system: CHAT_SYSTEM_PROMPT,
    messages: messages.map(({ role, content }) => ({ role, content })),
  });

  return response.content.find((block) => block.type === 'text')?.text ?? '';
}
