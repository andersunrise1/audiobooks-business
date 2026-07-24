import { lookupWord } from './technicalDictionaryService.js';

// Shown when a real AI call throws (network error, Anthropic outage/rate
// limit, timeout) - distinct from the ANTHROPIC_API_KEY-missing 503, which
// is a deployment/config signal, not a runtime failure to fall back from.
export const SUPPORT_CONTACT_EMAIL = 'suporte@techspeak.dev';
export const EXTERNAL_DOCS_URL = 'https://developer.mozilla.org/';

const GENERAL_FAQ = [
  {
    question: 'O tutor de IA está fora do ar, o que eu faço?',
    answer:
      'Tente novamente em alguns instantes. Enquanto isso, clique em qualquer palavra do texto para ver a tradução e explicação salvas no dicionário técnico do app.',
  },
  {
    question: 'Onde posso aprender mais sobre este termo técnico?',
    answer: `Consulte a documentação técnica em ${EXTERNAL_DOCS_URL} ou pesquise o termo em inglês junto com "documentation".`,
  },
  {
    question: 'Como faço para relatar um problema?',
    answer: `Envie um e-mail para ${SUPPORT_CONTACT_EMAIL} descrevendo o que aconteceu.`,
  },
];

function baseFallback() {
  return {
    fallback: true,
    faq: GENERAL_FAQ,
    externalDocsUrl: EXTERNAL_DOCS_URL,
    supportContact: SUPPORT_CONTACT_EMAIL,
  };
}

export async function getExplainFallback(word) {
  const entry = await lookupWord(word);

  return {
    ...baseFallback(),
    word,
    source: entry ? 'dictionary' : 'faq',
    explanation: entry
      ? `${entry.technical_explanation} (Tradução: ${entry.portuguese_translation})`
      : null,
  };
}

export function getChatFallback() {
  return {
    ...baseFallback(),
    reply:
      'O tutor de IA está temporariamente indisponível. Veja as perguntas frequentes abaixo ou tente novamente em instantes.',
  };
}

export function getRemedialFallback() {
  return {
    ...baseFallback(),
    summary: 'O tutor de IA está temporariamente indisponível para gerar um resumo deste capítulo.',
    keywords: [],
    exercise: '',
  };
}
