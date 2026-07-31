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
  const [fontFamily, setFontFamily] = useState(
    () => localStorage.getItem('techspeak_font_family') || 'font-sans',
  );
  const [voicePref, setVoicePref] = useState(
    () => localStorage.getItem('techspeak_voice_pref') || 'female',
  );
  const [error, setError] = useState('');
  const [paywalled, setPaywalled] = useState(false);
  const [loading, setLoading] = useState(true);
  // Dia 55-56: paywall message A/B test - falls back to the Dia 49 original
  // copy while the assignment call is in flight or if it fails.
  const [paywallVariant, setPaywallVariant] = useState(null);
  // Whether the progress fetch below has settled with a real success/
  // failure for an authenticated visitor - progressByChapter starts as {}
  // either way, so this is what tells the resume logic below it's safe to
  // read. An anonymous visitor never needs this (progressReady, further
  // down, treats them as always ready).
  const [progressLoaded, setProgressLoaded] = useState(false);
  // Guards the auto-resume jump to only happen once per book load, so
  // manually browsing to an earlier chapter afterward doesn't get
  // overridden the next time progressByChapter updates (e.g. after
  // finishing a chapter).
  const [hasResumed, setHasResumed] = useState(false);
  // Tracks which book these two flags belong to, so they can be reset
  // during render (React's own recommended pattern for state that should
  // reset when a prop changes) instead of inside an effect.
  const [resetForBookId, setResetForBookId] = useState(id);
  if (id !== resetForBookId) {
    setResetForBookId(id);
    setProgressLoaded(false);
    setHasResumed(false);
  }

  // Free audiobooks are playable by anonymous visitors (Dia 49's backend
  // already supports this via optionalAuth) - this route no longer requires
  // login, so the chapters fetch and the progress fetch are independent:
  // an anonymous visitor has no progress to load, and that's not an error.
  useEffect(() => {
    apiRequest(`/api/audiobooks/${id}/chapters`, { token: accessToken })
      .then((chapterList) => {
        setPaywalled(false);
        setChapters(chapterList);
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
        return getCachedProgress().then((cached) => {
          setProgressByChapter(Object.fromEntries(cached.map((p) => [p.chapter_id, p])));
        });
      })
      .finally(() => setProgressLoaded(true));
  }, [id, isAuthenticated, accessToken]);

  // Reading marker: jump straight to the first not-yet-completed chapter
  // instead of always landing on chapter 1, so reopening a book in
  // progress continues where the reader left off. Computed during render
  // (guarded by hasResumed, so it only ever applies once per book load)
  // rather than in an effect, since it's purely derived from chapters +
  // progress that already changed this render - the React-recommended
  // pattern for adjusting state in response to other state changing.
  const progressReady = !isAuthenticated || progressLoaded;
  if (!hasResumed && chapters.length > 0 && progressReady) {
    const firstIncomplete = chapters.findIndex((c) => !progressByChapter[c.id]?.completed);
    setHasResumed(true);
    setChapterIndex(firstIncomplete === -1 ? chapters.length - 1 : firstIncomplete);
  }

  useEffect(() => {
    if (!paywalled) return;
    getExperimentAssignment('paywall_message')
      .then(setPaywallVariant)
      .catch(() => setPaywallVariant(null));
  }, [paywalled]);

  const chapter = chapters[chapterIndex];
  const activeWordId = useWordSync(words, currentTime);

  // Chapters generated by scripts/generateNarration.js have both a female
  // and a male audio_url; older/legacy chapters (e.g. Daily Standup's
  // Opening, seeded on Dia 11) only have the single `audio_url` column -
  // fall back to it so those still play.
  const genderedAudioUrl =
    voicePref === 'male' ? chapter?.audio_url_male : chapter?.audio_url_female;
  const resolvedChapterAudioUrl = genderedAudioUrl || chapter?.audio_url;
  const hasVoiceChoice = Boolean(chapter?.audio_url_female && chapter?.audio_url_male);

  function handleVoicePrefChange(pref) {
    setVoicePref(pref);
    localStorage.setItem('techspeak_voice_pref', pref);
  }

  function handleFontFamilyChange(family) {
    setFontFamily(family);
    localStorage.setItem('techspeak_font_family', family);
  }

  // Nudges the reader toward re-listening/reviewing flashcards when they
  // open a chapter they've already completed - shows for 8s then closes on
  // its own, so it doesn't linger and get in the way of actually reading.
  // Arming the toast (tipArmedForChapterId) happens during render, the same
  // pattern resetForBookId above uses, since it's purely a reaction to
  // chapter/progress changing this render; only the 8s auto-hide itself
  // needs an effect (a real external timer to synchronize with), and that
  // effect's only setState call is deferred inside the timeout callback.
  // Gated on hasResumed (read as it was at the *start* of this render, since
  // setHasResumed(true) above doesn't retroactively change that binding) -
  // without it, this would arm the tip for chapter 1 (still completed) in
  // the same render the resume logic decides to jump away from it, since
  // `chapter` here still reflects the pre-jump chapterIndex.
  const isChapterCompleted = Boolean(progressByChapter[chapter?.id]?.completed);
  const [tipArmedForChapterId, setTipArmedForChapterId] = useState(null);
  const [showRepeatTip, setShowRepeatTip] = useState(false);
  if (hasResumed && isChapterCompleted && chapter?.id && tipArmedForChapterId !== chapter.id) {
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

  useEffect(() => {
    if (!chapter?.id || !resolvedChapterAudioUrl) return undefined;
    let cancelled = false;

    getCachedAudioPath(chapter.id).then((cachedPath) => {
      if (cancelled) return;
      setAudioSrc(cachedPath || resolvedChapterAudioUrl);

      if (!cachedPath && isDesktop) {
        cacheChapterAudio(chapter.id, resolvedChapterAudioUrl).catch((err) =>
          console.error('failed to cache chapter audio for offline playback', err),
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [chapter?.id, resolvedChapterAudioUrl]);

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
    <div className="flex flex-col gap-4 max-w-2xl mx-auto pb-28">
      {chapterIndex > 0 && (
        <button
          type="button"
          onClick={handlePrevChapter}
          aria-label="Capítulo anterior"
          className="fixed left-1 md:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-white/90 dark:bg-stone-800/90 shadow-md text-slate-600 dark:text-stone-300 text-2xl touch-manipulation"
        >
          ‹
        </button>
      )}

      {chapterIndex < chapters.length - 1 && (
        <button
          type="button"
          onClick={handleNextChapter}
          aria-label="Próximo capítulo"
          className="fixed right-1 md:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-white/90 dark:bg-stone-800/90 shadow-md text-slate-600 dark:text-stone-300 text-2xl touch-manipulation"
        >
          ›
        </button>
      )}

      <ReaderTopBar
        chapters={chapters}
        chapterIndex={chapterIndex}
        onSelectChapter={setChapterIndex}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        fontFamily={fontFamily}
        onFontFamilyChange={handleFontFamilyChange}
        progressFraction={duration ? currentTime / duration : 0}
        volume={playbackVolume}
        onVolumeChange={setPlaybackVolume}
        voicePref={voicePref}
        onVoicePrefChange={hasVoiceChoice ? handleVoicePrefChange : undefined}
      />

      {progressByChapter[chapter.id]?.completed && (
        <p className="text-slate-500 dark:text-stone-400 text-sm -mt-2">Concluído</p>
      )}

      {showRepeatTip && (
        <div className="fixed top-28 inset-x-0 z-30 flex justify-center px-4 pointer-events-none">
          <div className="animate-popup-in pointer-events-auto max-w-sm w-full rounded-lg bg-white text-slate-900 shadow-lg p-3 flex items-start gap-2">
            <p className="text-sm flex-1">
              💡 <strong>Dica:</strong> releia este capítulo mais vezes (use o botão 🔁) e revise
              seus flashcards depois. A repetição é comprovadamente a forma mais eficaz de fixar
              vocabulário novo na memória — é assim que seu inglês técnico avança de verdade.
            </p>
            <button
              type="button"
              onClick={() => setShowRepeatTip(false)}
              className="w-6 h-6 shrink-0 flex items-center justify-center text-slate-400 hover:text-slate-900 touch-manipulation"
              aria-label="Fechar dica"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {resolvedChapterAudioUrl ? (
        <AudioPlayer
          key={`${chapter.id}-${voicePref}`}
          src={audioSrc ?? resolvedChapterAudioUrl}
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
        fontFamily={fontFamily}
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
