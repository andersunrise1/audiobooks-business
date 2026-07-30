const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';

// OpenAI's fixed named voices - no per-account voice IDs to configure,
// unlike ElevenLabs' library voices. 'nova'/'onyx' are OpenAI's own
// recommended female/male picks.
const VOICE_BY_GENDER = { female: 'nova', male: 'onyx' };

export function isOpenAiTtsConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function generateNarrationAudioOpenAi(text, gender) {
  const voice = VOICE_BY_GENDER[gender] ?? VOICE_BY_GENDER.female;

  const response = await fetch(OPENAI_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      voice,
      input: text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OpenAI TTS request failed (${response.status}): ${body}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
