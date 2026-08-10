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

const FONT_SIZES = [16, 18, 20];
const FONT_FAMILIES = [
  { value: undefined, label: 'Padrão' },
  { value: 'serif', label: 'Serifada' },
  { value: 'monospace', label: 'Mono' },
];

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
  // Ports web's PlayerPage.jsx repetition tip: nudges the reader to relisten
  // (🔁) and review flashcards once they reach the last chapter. Web only
  // arms this after its auto-resume-to-last-incomplete-chapter logic
  // settles (hasResumed); mobile has no such resume jump, so arming simply
  // whenever the last chapter becomes current is the direct equivalent.
  // tipArmedForChapterId (not a plain boolean) keeps this from re-firing on
  // every re-render of the same last chapter.
  const [tipArmedForChapterId, setTipArmedForChapterId] = useState(null);
  const [showRepeatTip, setShowRepeatTip] = useState(false);
  // Mirrors web's ReaderTopBar (Aa size cycle + Padrão/Serifada/Mono family
  // picker) - real device feedback: there was no way to adjust reading text
  // at all on mobile, on any book. Applies to every chapter/book equally
  // since it lives here, not per-screen. FONT_SIZES/FONT_FAMILIES match
  // web's text-base/lg/xl (16/18/20px) and font-sans/serif/mono, using RN's
  // built-in generic family names instead of loading real font files - no
  // new native dependency.
  const [fontSizeIndex, setFontSizeIndex] = useState(1);
  const [fontFamilyIndex, setFontFamilyIndex] = useState(0);

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

  const isLastChapter = chapters.length > 0 && chapterIndex === chapters.length - 1;
  if (isLastChapter && chapter?.id && tipArmedForChapterId !== chapter.id) {
    setTipArmedForChapterId(chapter.id);
    setShowRepeatTip(true);
  }
  useEffect(() => {
    if (!showRepeatTip) return undefined;
    const timer = setTimeout(() => setShowRepeatTip(false), 8000);
    return () => clearTimeout(timer);
  }, [showRepeatTip]);

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

  function cycleFontSize() {
    setFontSizeIndex((i) => (i + 1) % FONT_SIZES.length);
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
      {showRepeatTip && (
        <View style={styles.tipWrap} pointerEvents="box-none">
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              💡 <Text style={styles.tipBold}>Dica:</Text> releia este capítulo mais vezes (use o
              botão 🔁) e revise seus flashcards depois. A repetição é comprovadamente a forma mais
              eficaz de fixar vocabulário novo na memória — é assim que seu inglês técnico avança de
              verdade.
            </Text>
            <Pressable onPress={() => setShowRepeatTip(false)} hitSlop={8} style={styles.tipClose}>
              <Text style={styles.tipCloseText}>✕</Text>
            </Pressable>
          </View>
        </View>
      )}

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

        <View style={styles.fontControls}>
          <Pressable
            style={[
              styles.fontSizeButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={cycleFontSize}
            accessibilityLabel="Alterar tamanho do texto"
          >
            <Text style={[styles.fontSizeButtonText, { color: colors.text }]}>Aa</Text>
          </Pressable>
          {FONT_FAMILIES.map((option, index) => {
            const isActive = index === fontFamilyIndex;
            return (
              <Pressable
                key={option.label}
                onPress={() => setFontFamilyIndex(index)}
                style={[
                  styles.fontFamilyButton,
                  {
                    backgroundColor: isActive ? 'rgba(37,99,235,0.2)' : colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.fontFamilyButtonText,
                    { color: isActive ? '#2563eb' : colors.text, fontFamily: option.value },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.chapterTitle, { color: colors.text }]}>{chapter.title}</Text>

        <TranscriptText
          transcript={chapter.transcript}
          words={words}
          onWordPress={handleWordPress}
          onTranslateWord={handleTranslateWord}
          fontSize={FONT_SIZES[fontSizeIndex]}
          fontFamily={FONT_FAMILIES[fontFamilyIndex].value}
        />
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
  fontControls: { flexDirection: 'row', gap: 6 },
  fontSizeButton: {
    width: 36,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeButtonText: { fontSize: 14, fontWeight: '700' },
  fontFamilyButton: {
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontFamilyButtonText: { fontSize: 12, fontWeight: '600' },
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
  tipWrap: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    maxWidth: 420,
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  tipText: { flex: 1, color: '#0f172a', fontSize: 13, lineHeight: 19 },
  tipBold: { fontWeight: '700' },
  tipClose: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  tipCloseText: { color: '#94a3b8', fontSize: 15 },
});
