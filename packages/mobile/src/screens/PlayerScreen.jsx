import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { apiRequest } from '../services/api.js';
import { useAuth } from '../store/AuthContext.jsx';
import { useTheme } from '../store/ThemeContext.jsx';
import TranscriptText from '../components/TranscriptText.jsx';
import TranslationModal from '../components/TranslationModal.jsx';
import AudioControls from '../components/AudioControls.jsx';

// Rebuilt to match packages/web/src/components/pages/PlayerPage.jsx's
// layout - real device feedback: the reading screen looked like a
// stripped-down version of the site (no cover, no chapter count header, no
// real audio controls, no side page-turn arrows). Cover + audiobook title
// fetched here since mobile has no persistent Sidebar.jsx equivalent to
// carry that context across screens.
export default function PlayerScreen({ route, navigation }) {
  const { audiobookId, title } = route.params;
  const { accessToken, isAuthenticated } = useAuth();
  const { colors } = useTheme();

  const [audiobook, setAudiobook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [words, setWords] = useState([]);
  const [progressByChapter, setProgressByChapter] = useState({});
  const [selectedWord, setSelectedWord] = useState(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paywalled, setPaywalled] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  useEffect(() => {
    apiRequest(`/api/audiobooks/${audiobookId}`)
      .then(setAudiobook)
      .catch(() => setAudiobook(null));
  }, [audiobookId]);

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
  // Most of the catalog only has audio_url_female/audio_url_male populated
  // (Dia 42) - plain audio_url only exists for a handful of legacy
  // chapters. Without this fallback (mirroring web's PlayerPage.jsx), the
  // play button silently disappeared for ~95% of chapters.
  const resolvedAudioUrl =
    chapter?.audio_url_female || chapter?.audio_url_male || chapter?.audio_url;

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

  // Resolves any word in the transcript that isn't already tagged, mirroring
  // web's PlayerPage.jsx handleTranslateWord exactly: the backend checks
  // technical_dictionary before ever calling AI, and caches the result as a
  // real words row, so the same word only costs a real AI call once, ever,
  // across the whole catalog. Only wired in for authenticated users since it
  // can trigger a real, rate-limited AI call.
  async function handleTranslateWord(word) {
    if (!isAuthenticated || !chapter) return null;
    try {
      const resolved = await apiRequest('/api/ai/translate-word', {
        method: 'POST',
        token: accessToken,
        body: { word, context: chapter.transcript, chapterId: chapter.id },
      });
      return resolved;
    } catch (err) {
      console.error('failed to translate word', err);
      return null;
    }
  }

  function handlePrevChapter() {
    setChapterIndex((i) => Math.max(i - 1, 0));
  }

  function handleNextChapter() {
    setChapterIndex((i) => Math.min(i + 1, chapters.length - 1));
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (paywalled) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Este audiobook é exclusivo do Vitalício
        </Text>
        <Text style={[styles.muted, { color: colors.muted }]}>
          Faça login e adquira o acesso para continuar (compra pelo app web por enquanto).
        </Text>
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

  if (!chapter) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.muted, { color: colors.muted }]}>
          Este audiobook ainda não tem capítulos.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {chapterIndex > 0 && (
        <Pressable
          style={[styles.navArrow, styles.navArrowLeft, { backgroundColor: colors.card }]}
          onPress={handlePrevChapter}
        >
          <Text style={[styles.navArrowText, { color: colors.text }]}>‹</Text>
        </Pressable>
      )}
      {chapterIndex < chapters.length - 1 && (
        <Pressable
          style={[styles.navArrow, styles.navArrowRight, { backgroundColor: colors.card }]}
          onPress={handleNextChapter}
        >
          <Text style={[styles.navArrowText, { color: colors.text }]}>›</Text>
        </Pressable>
      )}

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={[styles.cover, { backgroundColor: colors.card }]}>
            {audiobook?.cover_image_url ? (
              <Image source={{ uri: audiobook.cover_image_url }} style={styles.coverImage} />
            ) : (
              <Text style={styles.coverPlaceholder}>📖</Text>
            )}
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.bookTitle, { color: colors.muted }]} numberOfLines={2}>
              {audiobook?.title || title}
            </Text>
            <Text style={[styles.chapterCount, { color: colors.text }]}>
              Capítulo {chapterIndex + 1} de {chapters.length}
              {progressByChapter[chapter.id]?.completed && ' · concluído'}
            </Text>
          </View>
        </View>

        <Text style={[styles.chapterTitle, { color: colors.text }]}>{chapter.title}</Text>

        <TranscriptText
          transcript={chapter.transcript}
          words={words}
          onWordPress={handleWordPress}
          onTranslateWord={handleTranslateWord}
        />

        {isAuthenticated && (
          <Pressable
            style={[
              styles.chatButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => navigation.navigate('Chat', { chapterId: chapter.id })}
          >
            <Text style={[styles.chatButtonText, { color: colors.text }]}>
              💬 Conversar com o tutor
            </Text>
          </Pressable>
        )}
      </ScrollView>

      <AudioControls
        key={chapter.id}
        src={resolvedAudioUrl}
        onEnded={handleEnded}
        speed={playbackSpeed}
        onSpeedChange={setPlaybackSpeed}
        onPrevChapter={handlePrevChapter}
        onNextChapter={handleNextChapter}
        hasPrevChapter={chapterIndex > 0}
        hasNextChapter={chapterIndex < chapters.length - 1}
      />

      <TranslationModal word={selectedWord} onClose={() => setSelectedWord(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 8 },
  container: { padding: 16, paddingBottom: 24, gap: 16 },
  title: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  muted: { fontSize: 13 },
  error: { color: '#dc2626' },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  cover: {
    width: 56,
    height: 76,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: { fontSize: 24 },
  headerText: { flex: 1, gap: 2 },
  bookTitle: { fontSize: 12 },
  chapterCount: { fontSize: 14, fontWeight: '600' },
  chapterTitle: { fontSize: 20, fontWeight: 'bold' },
  navArrow: {
    position: 'absolute',
    top: '45%',
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  navArrowLeft: { left: 6 },
  navArrowRight: { right: 6 },
  navArrowText: { fontSize: 24, lineHeight: 26 },
  chatButton: { borderWidth: 1, borderRadius: 8, padding: 14, alignItems: 'center' },
  chatButtonText: { fontWeight: '600' },
});
