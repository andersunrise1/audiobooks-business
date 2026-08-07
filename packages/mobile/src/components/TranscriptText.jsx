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
export default function TranscriptText({ transcript, words, onWordPress, onTranslateWord }) {
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
    <Text style={{ fontSize: 16, lineHeight: 26, color: colors.text }}>
      {segments.map((segment, index) =>
        segment.type === 'word' ? (
          <Text
            key={index}
            onPress={() => handlePress(segment)}
            style={{
              textDecorationLine: 'underline',
              color: '#2563eb',
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
