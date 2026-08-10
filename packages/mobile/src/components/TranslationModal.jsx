import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Mirrors packages/web/src/components/features/TranslationPopup.jsx's
// fields (word, part_of_speech, pronunciation, portuguese_translation,
// technical_explanation, example_sentence, contexts) as a bottom-sheet-style
// Modal instead of a fixed-position popup - the closer native-feeling
// equivalent on mobile.
//
// Real bug fixed here: without a maxHeight + ScrollView, a word with a long
// technical_explanation/example_sentence made the sheet grow past the top
// of small-screen devices, clipping content instead of scrolling it - and
// with no bottom safe-area padding, the last line sat under the gesture
// nav bar on devices that have one.
export default function TranslationModal({ word, onClose }) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  return (
    <Modal visible={Boolean(word)} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { maxHeight: windowHeight * 0.75, paddingBottom: 20 + insets.bottom },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {word && (
            <ScrollView showsVerticalScrollIndicator={false}>
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

              {word.loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#475569" />
                  <Text style={styles.muted}>Traduzindo...</Text>
                </View>
              ) : (
                <>
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
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Deliberately light gray + black text regardless of the app's light/dark
// theme (direct device feedback: the previous navy-blue sheet was hard to
// read) - a fixed, always-legible popup rather than a themed one.
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#f1f5f9',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    gap: 6,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  headerText: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  word: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  partOfSpeech: { fontSize: 12, color: '#475569', textTransform: 'uppercase' },
  close: { fontSize: 18, color: '#475569' },
  muted: { color: '#334155', fontSize: 14 },
  translation: { color: '#0f172a', fontSize: 16 },
  example: { color: '#475569', fontSize: 14, fontStyle: 'italic' },
});
