import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { apiRequest } from '../services/api.js';
import { useAuth } from '../store/AuthContext.jsx';
import { getCachedFlashcards, cacheFlashcards } from '../services/offlineCache.js';

export default function FlashcardsScreen() {
  const { accessToken } = useAuth();
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
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!card) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Nenhum flashcard para revisar agora. Volte mais tarde!</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.progress}>
        {index + 1} de {cards.length}
      </Text>
      {offline && (
        <Text style={styles.offlineNotice}>
          Offline — mostrando os flashcards da última sincronização.
        </Text>
      )}

      <View style={styles.card}>
        <Text style={styles.word}>{card.word}</Text>

        {revealed ? (
          <View style={{ gap: 6 }}>
            {card.portuguese_translation && <Text>{card.portuguese_translation}</Text>}
            {card.technical_explanation && (
              <Text style={styles.muted}>{card.technical_explanation}</Text>
            )}
            {card.example_sentence && <Text style={styles.example}>“{card.example_sentence}”</Text>}
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
            <Text>Não lembrei</Text>
          </Pressable>
          <Pressable style={[styles.rateButton, styles.rateMedium]} onPress={() => handleRate(3)}>
            <Text>Difícil</Text>
          </Pressable>
          <Pressable style={[styles.rateButton, styles.rateEasy]} onPress={() => handleRate(5)}>
            <Text>Fácil</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { padding: 16, gap: 16, flexGrow: 1 },
  progress: { color: '#64748b', fontSize: 13 },
  offlineNotice: { color: '#d97706', fontSize: 12 },
  muted: { color: '#64748b' },
  error: { color: '#dc2626' },
  card: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 24,
    minHeight: 160,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  word: { fontSize: 20, fontWeight: 'bold' },
  example: { fontStyle: 'italic', color: '#64748b' },
  revealButton: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  revealButtonText: { color: '#fff', fontWeight: '600' },
  rateRow: { flexDirection: 'row', gap: 8 },
  rateButton: { flex: 1, borderRadius: 6, paddingVertical: 12, alignItems: 'center' },
  rateHard: { backgroundColor: '#fee2e2' },
  rateMedium: { backgroundColor: '#fef3c7' },
  rateEasy: { backgroundColor: '#dcfce7' },
});
