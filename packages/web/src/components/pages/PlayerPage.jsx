import { lazy, Suspense, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AudioPlayer from '../features/AudioPlayer.jsx';
import NarrationPlayer from '../features/NarrationPlayer.jsx';
import TranscriptDisplay from '../features/TranscriptDisplay.jsx';
import ReaderTopBar from '../features/ReaderTopBar.jsx';
import { useWordSync } from '../../hooks/useWordSync.js';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';
import { getExperimentAssignment, recordExperimentConversion } from '../../services/experiments.js';
import {
  queueDesktopProgress,
  getCachedAudioPath,
  cacheChapterAudio,
  getCachedProgress,
  isDesktop,
} from '../../services/desktopBridge.js';

// Dia 73-74: this is a heavier, non-essential-to-first-paint part of the
// player (post-chapter feedback) - lazy-loading it shrinks the PlayerPage
// route's own chunk, which was already the largest lazy chunk in the app
// (21.83kB / 6.61kB gzip) even after Dia 23's route-level code splitting.
const ChapterFeedback = lazy(() => import('../features/ChapterFeedback.jsx'));

function PlayerPage() {
  const { id } = useParams();
  const { accessToken, isAuthenticated } = useAuth();

  const [chapters, setChapters] = useState([]);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [progressByChapter, setProgressByChapter] = useState({});
  const [words, setWords] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioSrc, setAudioSrc] = useState(null);
  const [playbackVolume, setPlaybackVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [fontSize, setFontSize] = useState('text-lg');
  const [error, setError] = useState('');
  const [paywalled, setPaywalled] = useState(false);
  const [loading, setLoading] = useState(true);
  // Dia 55-56: paywall message A/B test - falls back to the Dia 49 original
  // copy while the assignment call is in flight or if it fails.
  const [paywallVariant, setPaywallVariant] = useState(null);

  // Free audiobooks are playable by anonymous visitors (Dia 49's backend
  // already supports this via optionalAuth) - this route no longer requires
  // login, so the chapters fetch and the progress fetch are independent:
  // an anonymous visitor has no progress to load, and that's not an error.
  useEffect(() => {
    apiRequest(`/api/audiobooks/${id}/chapters`, { token: accessToken })
      .then((chapterList) => {
        setPaywalled(false);
        setChapters(chapterList);
        setChapterIndex(0);
      })
      .catch((err) => {
        if (err.status === 403) {
          setPaywalled(true);
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  }, [id, accessToken]);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiRequest('/api/user/progress', { token: accessToken })
      .then((progressList) => {
        setProgressByChapter(Object.fromEntries(progressList.map((p) => [p.chapter_id, p])));
      })
      .catch((err) => {
        console.error('failed to load progress', err);
        if (!isDesktop) return;
        // Offline on desktop: fall back to the last-synced local cache
        // instead of leaving progress (e.g. "concluído" markers) blank.
        getCachedProgress().then((cached) => {
          setProgressByChapter(Object.fromEntries(cached.map((p) => [p.chapter_id, p])));
        });
      });
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    if (!paywalled) return;
    getExperimentAssignment('paywall_message')
      .then(setPaywallVariant)
      .catch(() => setPaywallVariant(null));
  }, [paywalled]);

  const chapter = chapters[chapterIndex];
  const activeWordId = useWordSync(words, currentTime);

  useEffect(() => {
    if (!chapter?.id) return;
    apiRequest(`/api/audiobooks/chapters/${chapter.id}/words`)
      .then(setWords)
      .catch(() => setWords([]));
  }, [chapter?.id]);

  useEffect(() => {
    if (!chapter?.id) return undefined;
    let cancelled = false;

    getCachedAudioPath(chapter.id).then((cachedPath) => {
      if (cancelled) return;
      setAudioSrc(cachedPath || chapter.audio_url);

      if (!cachedPath && isDesktop) {
        cacheChapterAudio(chapter.id, chapter.audio_url).catch((err) =>
          console.error('failed to cache chapter audio for offline playback', err),
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [chapter?.id, chapter?.audio_url]);

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
      console.error('failed to save progress, queueing for desktop sync', err);
      queueDesktopProgress(chapterId, updates);
    }
  }

  function handleNextChapter() {
    setChapterIndex((i) => Math.min(i + 1, chapters.length - 1));
  }

  function handlePrevChapter() {
    setChapterIndex((i) => Math.max(i - 1, 0));
  }

  function handleTimeUpdate(time, totalDuration) {
    setCurrentTime(time);
    setDuration(totalDuration || 0);
  }

  function handleChapterEnded() {
    if (!chapter) return;
    const previous = progressByChapter[chapter.id];
    saveProgress(chapter.id, {
      completed: true,
      listeningCount: (previous?.listening_count ?? 0) + 1,
    });
  }

  async function handleWordClick(word) {
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

  // Resolves any word in the transcript that isn't already tagged - the
  // backend checks technical_dictionary before ever calling AI, and caches
  // the result as a real words row, so the same word only costs a real AI
  // call once, ever, across the whole catalog. Only wired in for
  // authenticated users since it can trigger a real, rate-limited AI call.
  async function handleTranslateWord(word) {
    if (!isAuthenticated || !chapter) return null;
    try {
      const resolved = await apiRequest('/api/ai/translate-word', {
        method: 'POST',
        token: accessToken,
        body: { word, context: chapter.transcript, chapterId: chapter.id },
      });
      await handleWordClick(resolved);
      return resolved;
    } catch (err) {
      console.error('failed to translate word', err);
      return null;
    }
  }

  if (loading) return <p>Carregando...</p>;
  if (paywalled) {
    const message =
      paywallVariant?.config?.message ??
      'Este audiobook faz parte do TechSpeak Vitalício. Faça login e adquira o acesso para continuar.';

    function handleSeePlansClick() {
      if (paywallVariant) {
        recordExperimentConversion('paywall_message', paywallVariant.variant, { audiobookId: id });
      }
    }

    return (
      <div className="flex flex-col gap-3 max-w-md">
        <h1 className="text-xl font-bold">Este audiobook é exclusivo do Vitalício</h1>
        <p className="text-slate-600 dark:text-stone-300">{message}</p>
        <Link
          to="/pricing"
          onClick={handleSeePlansClick}
          className="bg-primary neon-glow text-white rounded px-4 py-2 font-semibold text-center touch-manipulation"
        >
          Ver planos
        </Link>
      </div>
    );
  }
  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;
  if (!chapter)
    return (
      <p className="text-slate-500 dark:text-stone-400">Este audiobook ainda não tem capítulos.</p>
    );

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto">
      <ReaderTopBar
        chapters={chapters}
        chapterIndex={chapterIndex}
        onSelectChapter={setChapterIndex}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        progressFraction={duration ? currentTime / duration : 0}
        volume={playbackVolume}
        onVolumeChange={setPlaybackVolume}
      />

      {progressByChapter[chapter.id]?.completed && (
        <p className="text-slate-500 dark:text-stone-400 text-sm -mt-2">Concluído</p>
      )}

      {chapter.audio_url ? (
        <AudioPlayer
          key={chapter.id}
          src={audioSrc ?? chapter.audio_url}
          onEnded={handleChapterEnded}
          onTimeUpdate={handleTimeUpdate}
          volume={playbackVolume}
          speed={playbackSpeed}
          onSpeedChange={setPlaybackSpeed}
          onPrevChapter={handlePrevChapter}
          onNextChapter={handleNextChapter}
          hasPrevChapter={chapterIndex > 0}
          hasNextChapter={chapterIndex < chapters.length - 1}
        />
      ) : (
        // No recorded audio for this chapter (most of the catalog, as of
        // this feature) - offer optional browser-based narration instead of
        // silently showing no player at all.
        <NarrationPlayer key={chapter.id} text={chapter.transcript} onEnded={handleChapterEnded} />
      )}

      <h2 className="text-xl font-bold">{chapter.title}</h2>

      <TranscriptDisplay
        words={words}
        activeWordId={activeWordId}
        transcript={chapter.transcript}
        onWordClick={handleWordClick}
        onTranslateWord={isAuthenticated ? handleTranslateWord : undefined}
        fontSize={fontSize}
      />

      {isAuthenticated ? (
        progressByChapter[chapter.id]?.completed && (
          <Suspense fallback={null}>
            <ChapterFeedback key={`feedback-${chapter.id}`} chapterId={chapter.id} />
          </Suspense>
        )
      ) : (
        <p className="text-sm text-slate-500 dark:text-stone-400 border border-slate-200 dark:border-stone-700 rounded-lg p-4">
          Crie uma conta gratuita para salvar seu progresso e traduzir qualquer palavra
          automaticamente.{' '}
          <Link to="/register" state={{ from: `/audiobooks/${id}/player` }} className="underline">
            Criar conta
          </Link>
        </p>
      )}
    </div>
  );
}

export default PlayerPage;
