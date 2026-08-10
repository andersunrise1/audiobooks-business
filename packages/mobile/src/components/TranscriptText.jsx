import { useMemo } from 'react';
import { Text } from 'react-native';
import { buildSegments, normalize } from '../utils/transcriptSegments.js';
import { useTheme } from '../store/ThemeContext.jsx';

// RN's Text supports nested Text children with their own onPress, the same
// "inline tappable span" pattern packages/web's TranscriptDisplay.jsx uses
// with <span onClick>. No play-time word highlighting yet (that needs a
// ticking currentTime synced to audio position) - tap-to-translate is the
// MVP scope for this mobile port, matching Dia 86-90's "Player" priority
// without pulling in every desktop/web player feature.
//
// Every word is tappable, not just pre-tagged vocabulary (Dia 96-100
// feedback: this had silently fallen behind web's "click any word"
// upgrade) - a tap on an untagged word calls onTranslateWord to resolve it
// on demand (POST /api/ai/translate-word), same three-tier resolution web
// already uses.
//
// fontSize/fontFamily mirror web's ReaderTopBar (Aa size cycle + Padrão/
// Serifada/Mono family picker) - real device feedback that mobile had no
// way to adjust reading text at all. `fontFamily` uses RN's built-in
// generic family names ('serif'/'monospace', undefined for system default)
// rather than loading real font files - zero new native dependency, a
// deliberate choice after this session's earlier native-crash debugging.
export default function TranscriptText({
  transcript,
  words,
  onWordPress,
  onTranslateWord,
  fontSize = 16,
  fontFamily,
}) {
  const { colors } = useTheme();
  const segments = useMemo(() => buildSegments(transcript, words), [transcript, words]);

  if (!transcript) return null;

  // Real device feedback: the popup felt slow to "aparecer" for untagged
  // words, since it only opened once the full round trip (DB lookup, and
  // on a first-ever click for that word, a real AI call - up to a few
  // seconds) had already resolved - there was no visible feedback at all
  // in between besides the tapped word dimming slightly. Now the modal
  // opens immediately with a `loading` placeholder (TranslationModal shows
  // a spinner for it) and gets swapped for the real content once
  // onTranslateWord resolves - the wait itself is unchanged, but the app
  // responds to the tap instantly instead of staying silent.
  async function handlePress(segment) {
    if (segment.word) {
      onWordPress?.(segment.word);
      return;
    }
    if (!onTranslateWord) return;
    onWordPress?.({ word: segment.text, loading: true });
    const resolved = await onTranslateWord(normalize(segment.text));
    onWordPress?.(resolved ?? null);
  }

  return (
    <Text
      style={{
        fontSize,
        lineHeight: Math.round(fontSize * 1.625),
        color: colors.text,
        fontFamily,
      }}
    >
      {segments.map((segment, index) =>
        segment.type === 'word' ? (
          <Text key={index} onPress={() => handlePress(segment)} style={{ color: colors.text }}>
            {segment.text}
          </Text>
        ) : (
          <Text key={index}>{segment.text}</Text>
        ),
      )}
    </Text>
  );
}
