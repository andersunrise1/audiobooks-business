import { createClient } from '@deepgram/sdk';

export const deepgramClient = createClient(process.env.DEEPGRAM_API_KEY || 'not-configured');

// `deepgramClient.listen.prerecorded` is a getter that returns a fresh
// instance on every access, so accessing it once here and reusing that
// reference is what makes this mockable in tests (mocking a method on a
// throwaway instance wouldn't affect the one transcribeAudio actually calls).
export const prerecordedClient = deepgramClient.listen.prerecorded;

export async function transcribeAudio(buffer, mimetype) {
  const { result, error } = await prerecordedClient.transcribeFile(buffer, {
    model: 'nova-2',
    smart_format: true,
    language: 'en',
    mimetype,
  });

  if (error) {
    throw error;
  }

  return result.results.channels[0]?.alternatives[0]?.transcript ?? '';
}
