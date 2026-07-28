import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { apiRequest } from '../services/api.js';
import { useAuth } from '../store/AuthContext.jsx';
import TranscriptText from '../components/TranscriptText.jsx';
import TranslationModal from '../components/TranslationModal.jsx';

// Chapter audio/progress controls, remounted per chapter (the `key={chapter.id}`
// below) so useAudioPlayer always starts fresh - the same reset-on-chapter-
// change approach packages/web's AudioPlayer uses (Dia 25).
function ChapterAudio({ audioUrl, onEnded }) {
  const player = useAudioPlayer(audioUrl ?? undefined);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (status.didJustFinish) onEnded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish]);

  if (!audioUrl) {
    return <Text style={styles.muted}>Áudio ainda não disponível para este capítulo.</Text>;
  }

  return (
    <View style={styles.playerControls}>
      <Pressable
        style={styles.playButton}
        onPress={() => (status.playing ? player.pause() : player.play())}
      >
        <Text style={styles.playButtonText}>{status.playing ? 'Pausar' : 'Tocar'}</Text>
      </Pressable>
      <Text style={styles.muted}>
        {Math.floor(status.currentTime ?? 0)}s / {Math.floor(status.duration ?? 0)}s
      </Text>
    </View>
  );
}

export default function PlayerScreen({ route, navigation }) {
  const { audiobookId, title } = route.params;
  const { accessToken, isAuthenticated } = useAuth();

  const [chapters, setChapters] = useState([]);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [words, setWords] = useState([]);
  const [progressByChapter, setProgressByChapter] = useState({});
  const [selectedWord, setSelectedWord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paywalled, setPaywalled] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  useEffect(() => {
    apiRequest(`/api/audiobooks/${audiobookId}/chapters`, { token: accessToken })
      .then((list) => {
        setChapters(list);
        setChapterIndex(0);
      })
      .catch((err) => {
        if (err.status === 403) setPaywalled(true);
        else setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [audiobookId, accessToken]);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiRequest('/api/user/progress', { token: accessToken })
      .then((list) => {
        setProgressByChapter(Object.fromEntries(list.map((p) => [p.chapter_id, p])));
      })
      .catch(() => {});
  }, [isAuthenticated, accessToken]);

  const chapter = chapters[chapterIndex];

  useEffect(() => {
    if (!chapter?.id) return;
    apiRequest(`/api/audiobooks/chapters/${chapter.id}/words`)
      .then(setWords)
      .catch(() => setWords([]));
  }, [chapter?.id]);

  async function saveProgress(chapterId, updates) {
    if (!isAuthenticated) return;
    try {
      const updated = await apiRequest(`/api/user/progress/${chapterId}`, {
        method: 'POST',
        token: accessToken,
        body: updates,
      });
      setProgressByChapter((prev) => ({ ...prev, [chapterId]: updated }));
    } catch (err) {
      console.error('failed to save progress', err);
    }
  }

  function handleEnded() {
    if (!chapter) return;
    const previous = progressByChapter[chapter.id];
    saveProgress(chapter.id, {
      completed: true,
      listeningCount: (previous?.listening_count ?? 0) + 1,
    });
  }

  async function handleWordPress(word) {
    setSelectedWord(word);
    if (!isAuthenticated) return;
    try {
      const updated = await apiRequest('/api/user/words-learned', {
        method: 'POST',
        token: accessToken,
        body: { chapterId: chapter.id, wordId: word.id },
      });
      setProgressByChapter((prev) => ({ ...prev, [chapter.id]: updated }));
    } catch (err) {
      console.error('failed to save word click', err);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (paywalled) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Este audiobook é exclusivo do Vitalício</Text>
        <Text style={styles.muted}>
          Faça login e adquira o acesso para continuar (compra pelo app web por enquanto).
        </Text>
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

  if (!chapter) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Este audiobook ainda não tem capítulos.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.chapterTitle}>{chapter.title}</Text>
      <Text style={styles.muted}>
        Capítulo {chapterIndex + 1} de {chapters.length}
        {progressByChapter[chapter.id]?.completed && ' · concluído'}
      </Text>

      <ChapterAudio key={chapter.id} audioUrl={chapter.audio_url} onEnded={handleEnded} />

      <TranscriptText transcript={chapter.transcript} words={words} onWordPress={handleWordPress} />

      <View style={styles.navRow}>
        <Pressable
          style={[styles.navButton, chapterIndex === 0 && styles.navButtonDisabled]}
          disabled={chapterIndex === 0}
          onPress={() => setChapterIndex((i) => i - 1)}
        >
          <Text>Anterior</Text>
        </Pressable>
        <Pressable
          style={[
            styles.navButton,
            chapterIndex === chapters.length - 1 && styles.navButtonDisabled,
          ]}
          disabled={chapterIndex === chapters.length - 1}
          onPress={() => setChapterIndex((i) => Math.min(i + 1, chapters.length - 1))}
        >
          <Text>Próximo</Text>
        </Pressable>
      </View>

      {isAuthenticated && (
        <Pressable
          style={styles.chatButton}
          onPress={() => navigation.navigate('Chat', { chapterId: chapter.id })}
        >
          <Text style={styles.chatButtonText}>💬 Conversar com o tutor</Text>
        </Pressable>
      )}

      <TranslationModal word={selectedWord} onClose={() => setSelectedWord(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 8 },
  container: { padding: 16, gap: 16 },
  chapterTitle: { fontSize: 20, fontWeight: 'bold' },
  title: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  muted: { color: '#64748b', fontSize: 13 },
  error: { color: '#dc2626' },
  playerControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playButton: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  playButtonText: { color: '#fff', fontWeight: '600' },
  navRow: { flexDirection: 'row', gap: 8 },
  navButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  navButtonDisabled: { opacity: 0.5 },
  chatButton: { backgroundColor: '#f1f5f9', borderRadius: 8, padding: 14, alignItems: 'center' },
  chatButtonText: { fontWeight: '600' },
});
