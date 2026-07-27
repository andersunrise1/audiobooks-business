import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AudioPlayer from '../features/AudioPlayer.jsx';
import TranscriptDisplay from '../features/TranscriptDisplay.jsx';
import PronunciationRecorder from '../features/PronunciationRecorder.jsx';
import ChatWidget from '../features/ChatWidget.jsx';
import ChapterFeedback from '../features/ChapterFeedback.jsx';
import VoiceCommandBar from '../features/VoiceCommandBar.jsx';
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

function PlayerPage() {
  const { id } = useParams();
  const { accessToken, isAuthenticated } = useAuth();

  const [chapters, setChapters] = useState([]);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [progressByChapter, setProgressByChapter] = useState({});
  const [words, setWords] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioSrc, setAudioSrc] = useState(null);
  const [playbackVolume, setPlaybackVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
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
        <p className="text-slate-600">{message}</p>
        <Link
          to="/pricing"
          onClick={handleSeePlansClick}
          className="bg-slate-900 text-white rounded px-4 py-2 font-semibold text-center touch-manipulation"
        >
          Ver planos
        </Link>
      </div>
    );
  }
  if (error) return <p className="text-red-500">{error}</p>;
  if (!chapter) return <p className="text-slate-500">Este audiobook ainda não tem capítulos.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">{chapter.title}</h1>
        <p className="text-slate-500 text-sm">
          Capítulo {chapterIndex + 1} de {chapters.length}
          {progressByChapter[chapter.id]?.completed && ' · concluído'}
        </p>
      </div>

      <AudioPlayer
        key={chapter.id}
        src={audioSrc ?? chapter.audio_url}
        onEnded={handleChapterEnded}
        onTimeUpdate={setCurrentTime}
        volume={playbackVolume}
        onVolumeChange={setPlaybackVolume}
        speed={playbackSpeed}
        onSpeedChange={setPlaybackSpeed}
      />

      <TranscriptDisplay
        words={words}
        activeWordId={activeWordId}
        transcript={chapter.transcript}
        onWordClick={handleWordClick}
      />

      {chapter.transcript && <PronunciationRecorder targetSentence={chapter.transcript} />}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={chapterIndex === 0}
          onClick={() => setChapterIndex((i) => i - 1)}
          className="px-3 py-1 rounded bg-slate-100 disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={chapterIndex === chapters.length - 1}
          onClick={handleNextChapter}
          className="px-3 py-1 rounded bg-slate-100 disabled:opacity-50"
        >
          Próximo
        </button>
      </div>

      {isAuthenticated ? (
        <>
          <VoiceCommandBar context={chapter.transcript} onNextChapter={handleNextChapter} />

          {progressByChapter[chapter.id]?.completed && (
            <ChapterFeedback key={`feedback-${chapter.id}`} chapterId={chapter.id} />
          )}

          <ChatWidget key={`chat-${chapter.id}`} chapterId={chapter.id} />
        </>
      ) : (
        <p className="text-sm text-slate-500 border border-slate-200 rounded-lg p-4">
          Crie uma conta gratuita para salvar seu progresso e conversar com o tutor de IA.{' '}
          <Link to="/register" state={{ from: `/audiobooks/${id}/player` }} className="underline">
            Criar conta
          </Link>
        </p>
      )}
    </div>
  );
}

export default PlayerPage;
