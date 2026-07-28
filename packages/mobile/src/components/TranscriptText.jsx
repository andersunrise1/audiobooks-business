import { useMemo } from 'react';
import { Text } from 'react-native';
import { buildSegments } from '../utils/transcriptSegments.js';

// RN's Text supports nested Text children with their own onPress, the same
// "inline tappable span" pattern packages/web's TranscriptDisplay.jsx uses
// with <span onClick>. No play-time word highlighting yet (that needs a
// ticking currentTime synced to audio position) - tap-to-translate is the
// MVP scope for this mobile port, matching Dia 86-90's "Player" priority
// without pulling in every desktop/web player feature.
export default function TranscriptText({ transcript, words, onWordPress }) {
  const segments = useMemo(() => buildSegments(transcript, words), [transcript, words]);

  if (!transcript) return null;

  return (
    <Text style={{ fontSize: 16, lineHeight: 26, color: '#334155' }}>
      {segments.map((segment, index) =>
        segment.type === 'word' ? (
          <Text
            key={`${segment.word.id}-${index}`}
            onPress={() => onWordPress?.(segment.word)}
            style={{ textDecorationLine: 'underline', color: '#2563eb' }}
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
