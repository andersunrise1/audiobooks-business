import 'dotenv/config';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/database.js';
import {
  isElevenLabsConfigured,
  generateNarrationAudio as generateNarrationAudioElevenLabs,
} from '../src/services/narrationService.js';
import {
  isOpenAiTtsConfigured,
  generateNarrationAudioOpenAi,
} from '../src/services/openAiTtsService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.join(__dirname, '../public/audio/generated');
const GENDERS = ['female', 'male'];

// Controls how much this run can generate - both providers bill by
// character count, so this defaults small rather than generating the whole
// catalog in one run. Generates BOTH female and male narration per chapter
// by default, so the player can offer a voice choice - idempotent per
// (chapter, gender): a chapter that already has audio_url_female but not
// audio_url_male only generates the missing one, so re-running after
// hitting a quota limit safely picks up where it left off. Override with:
//   node scripts/generateNarration.js --limit=20
//   node scripts/generateNarration.js --limit=20 --voice=female
//   node scripts/generateNarration.js --provider=openai --limit=5
function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [key, value] = arg.replace(/^--/, '').split('=');
      return [key, value ?? true];
    }),
  );
  return {
    limit: Number(args.limit) || 10,
    genders: args.voice === 'female' || args.voice === 'male' ? [args.voice] : GENDERS,
    provider: args.provider === 'openai' ? 'openai' : 'elevenlabs',
  };
}

function pickElevenLabsVoiceId(gender) {
  const voiceId =
    gender === 'male'
      ? process.env.ELEVENLABS_VOICE_ID_MALE
      : process.env.ELEVENLABS_VOICE_ID_FEMALE;
  if (!voiceId) {
    throw new Error(
      `ELEVENLABS_VOICE_ID_${gender.toUpperCase()} is not set in packages/backend/.env`,
    );
  }
  return voiceId;
}

function resolveGenerator(provider, gender) {
  if (provider === 'openai') {
    if (!isOpenAiTtsConfigured()) {
      throw new Error('OPENAI_API_KEY is not set in packages/backend/.env');
    }
    return (text) => generateNarrationAudioOpenAi(text, gender);
  }

  if (!isElevenLabsConfigured()) {
    throw new Error('ELEVENLABS_API_KEY is not set in packages/backend/.env');
  }
  const voiceId = pickElevenLabsVoiceId(gender);
  return (text) => generateNarrationAudioElevenLabs(text, voiceId);
}

async function main() {
  const { limit, genders, provider } = parseArgs();
  const generators = Object.fromEntries(genders.map((g) => [g, resolveGenerator(provider, g)]));
  const backendUrl =
    process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;

  await mkdir(AUDIO_DIR, { recursive: true });

  // A chapter "needs work" if any of the requested genders is still null -
  // each gender is generated (or skipped) independently below.
  const missingConditions = genders.map((g) => `c.audio_url_${g} IS NULL`).join(' OR ');
  const { rows: chapters } = await pool.query(
    `SELECT c.id, c.title, c.transcript, c.audio_url_female, c.audio_url_male, ab.title AS book_title
     FROM chapters c
     JOIN audiobooks ab ON c.audiobook_id = ab.id
     WHERE ${missingConditions}
     ORDER BY ab.title, c.order_index
     LIMIT $1`,
    [limit],
  );

  if (chapters.length === 0) {
    console.log('No chapters missing narration for the requested voice(s) - nothing to generate.');
    return;
  }

  console.log(
    `Generating narration for ${chapters.length} chapter(s), provider=${provider}, voices=${genders.join('+')}...`,
  );

  let totalChars = 0;
  let totalCalls = 0;
  for (const chapter of chapters) {
    for (const gender of genders) {
      const existingUrl = gender === 'female' ? chapter.audio_url_female : chapter.audio_url_male;
      if (existingUrl) continue;

      process.stdout.write(
        `  ${chapter.book_title} / ${chapter.title} [${gender}] (${chapter.transcript.length} chars)... `,
      );
      const audioBuffer = await generators[gender](chapter.transcript);
      const fileName = `${provider}-${gender}-${chapter.id}.mp3`;
      await writeFile(path.join(AUDIO_DIR, fileName), audioBuffer);

      const audioUrl = `${backendUrl}/audio/generated/${fileName}`;
      const column = gender === 'female' ? 'audio_url_female' : 'audio_url_male';
      await pool.query(`UPDATE chapters SET ${column} = $1 WHERE id = $2`, [audioUrl, chapter.id]);

      totalChars += chapter.transcript.length;
      totalCalls += 1;
      console.log('done');
    }
  }

  console.log(`\nGenerated ${totalCalls} audio file(s), ${totalChars} characters total.`);
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error('Narration generation failed:', err.message);
    process.exitCode = 1;
    await pool.end();
  });
