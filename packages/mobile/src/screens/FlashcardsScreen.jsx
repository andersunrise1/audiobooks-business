import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { apiRequest } from '../services/api.js';
import { useAuth } from '../store/AuthContext.jsx';
import { useTheme } from '../store/ThemeContext.jsx';
import { getCachedFlashcards, cacheFlashcards } from '../services/offlineCache.js';

// Matches packages/web/src/components/pages/FlashcardReviewPage.jsx's
// model exactly - real device feedback: the reveal card's word text had no
// explicit color, defaulting to (in dark mode) near-invisible text; the
// whole screen otherwise looked like a stripped-down version of the site.
export default function FlashcardsScreen() {
  const { accessToken } = useAuth();
  const { colors } = useTheme();
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    apiRequest('/api/user/flashcards', { token: accessToken })
      .then((data) => {
        setOffline(false);
        setCards(data);
        cacheFlashcards(data);
      })
      .catch(async (err) => {
        const cached = await getCachedFlashcards();
        if (cached.length > 0) {
          setOffline(true);
          setCards(cached);
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  const card = cards[index];

  async function handleRate(quality) {
    if (!card) return;
    try {
      await apiRequest(`/api/user/flashcards/${card.id}/review`, {
        method: 'POST',
        token: accessToken,
        body: { quality },
      });
    } catch (err) {
      console.error('failed to save flashcard review', err);
    }
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!card) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Flashcards</Text>
        <Text style={[styles.muted, { color: colors.muted }]}>
          Nenhum flashcard para revisar agora. Volte mais tarde!
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      style={{ backgroundColor: colors.background }}
    >
      <View>
        <Text style={[styles.title, { color: colors.text }]}>Flashcards</Text>
        <Text style={[styles.progress, { color: colors.muted }]}>
          {index + 1} de {cards.length}
        </Text>
        {offline && (
          <Text style={styles.offlineNotice}>
            Offline — mostrando os flashcards da última sincronização.
          </Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.word, { color: colors.text }]}>{card.word}</Text>

        {revealed ? (
          <View style={{ gap: 6 }}>
            {card.portuguese_translation && (
              <Text style={[styles.translation, { color: colors.text }]}>
                {card.portuguese_translation}
              </Text>
            )}
            {card.technical_explanation && (
              <Text style={[styles.muted, { color: colors.muted }]}>
                {card.technical_explanation}
              </Text>
            )}
            {card.example_sentence && (
              <Text style={[styles.example, { color: colors.muted }]}>
                “{card.example_sentence}”
              </Text>
            )}
          </View>
        ) : (
          <Pressable style={styles.revealButton} onPress={() => setRevealed(true)}>
            <Text style={styles.revealButtonText}>Mostrar resposta</Text>
          </Pressable>
        )}
      </View>

      {revealed && (
        <View style={styles.rateRow}>
          <Pressable style={[styles.rateButton, styles.rateHard]} onPress={() => handleRate(1)}>
            <Text style={styles.rateHardText}>Não lembrei</Text>
          </Pressable>
          <Pressable style={[styles.rateButton, styles.rateMedium]} onPress={() => handleRate(3)}>
            <Text style={styles.rateMediumText}>Difícil</Text>
          </Pressable>
          <Pressable style={[styles.rateButton, styles.rateEasy]} onPress={() => handleRate(5)}>
            <Text style={styles.rateEasyText}>Fácil</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { padding: 16, gap: 16, flexGrow: 1 },
  title: { fontSize: 22, fontWeight: 'bold' },
  progress: { fontSize: 13, marginTop: 2 },
  offlineNotice: { color: '#d97706', fontSize: 12, marginTop: 4 },
  muted: { fontSize: 14 },
  error: { color: '#dc2626' },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 24,
    minHeight: 160,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  word: { fontSize: 20, fontWeight: 'bold' },
  translation: { fontSize: 16, textAlign: 'center' },
  example: { fontStyle: 'italic', fontSize: 14, textAlign: 'center' },
  revealButton: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  revealButtonText: { color: '#fff', fontWeight: '600' },
  rateRow: { flexDirection: 'row', gap: 8 },
  rateButton: { flex: 1, borderRadius: 6, paddingVertical: 12, alignItems: 'center' },
  rateHard: { backgroundColor: '#dc2626' },
  rateHardText: { color: '#fff', fontWeight: '600' },
  rateMedium: { backgroundColor: '#f59e0b' },
  rateMediumText: { color: '#0f172a', fontWeight: '600' },
  rateEasy: { backgroundColor: '#16a34a' },
  rateEasyText: { color: '#fff', fontWeight: '600' },
});
