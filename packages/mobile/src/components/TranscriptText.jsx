import { useMemo, useState } from 'react';
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
  const [loadingText, setLoadingText] = useState(null);
  const segments = useMemo(() => buildSegments(transcript, words), [transcript, words]);

  if (!transcript) return null;

  async function handlePress(segment) {
    if (segment.word) {
      onWordPress?.(segment.word);
      return;
    }
    if (!onTranslateWord) return;
    setLoadingText(segment.text);
    try {
      const resolved = await onTranslateWord(normalize(segment.text));
      if (resolved) onWordPress?.(resolved);
    } finally {
      setLoadingText(null);
    }
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
          <Text
            key={index}
            onPress={() => handlePress(segment)}
            style={{
              color: colors.text,
              opacity: loadingText === segment.text ? 0.5 : 1,
            }}
          >
            {segment.text}
          </Text>
        ) : (
          <Text key={index}>{segment.text}</Text>
        ),
      )}
    </Text>
  );
}
