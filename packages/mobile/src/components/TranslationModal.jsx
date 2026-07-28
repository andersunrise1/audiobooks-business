import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';

// Mirrors packages/web/src/components/features/TranslationPopup.jsx's
// fields (word, part_of_speech, pronunciation, portuguese_translation,
// technical_explanation, example_sentence, contexts) as a bottom-sheet-style
// Modal instead of a fixed-position popup - the closer native-feeling
// equivalent on mobile.
export default function TranslationModal({ word, onClose }) {
  return (
    <Modal visible={Boolean(word)} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {word && (
            <>
              <View style={styles.header}>
                <View style={styles.headerText}>
                  <Text style={styles.word}>{word.word}</Text>
                  {word.part_of_speech && (
                    <Text style={styles.partOfSpeech}>{word.part_of_speech}</Text>
                  )}
                </View>
                <Pressable onPress={onClose} hitSlop={12}>
                  <Text style={styles.close}>✕</Text>
                </Pressable>
              </View>

              {word.pronunciation && <Text style={styles.muted}>{word.pronunciation}</Text>}
              {word.portuguese_translation && (
                <Text style={styles.translation}>{word.portuguese_translation}</Text>
              )}
              {word.technical_explanation && (
                <Text style={styles.muted}>{word.technical_explanation}</Text>
              )}
              {word.example_sentence && (
                <Text style={styles.example}>“{word.example_sentence}”</Text>
              )}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    gap: 6,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerText: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  word: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  partOfSpeech: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase' },
  close: { fontSize: 18, color: '#94a3b8' },
  muted: { color: '#cbd5e1', fontSize: 14 },
  translation: { color: '#fff', fontSize: 16 },
  example: { color: '#94a3b8', fontSize: 14, fontStyle: 'italic' },
});
