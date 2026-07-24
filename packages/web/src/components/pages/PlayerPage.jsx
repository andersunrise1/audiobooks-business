import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AudioPlayer from '../features/AudioPlayer.jsx';
import TranscriptDisplay from '../features/TranscriptDisplay.jsx';
import PronunciationRecorder from '../features/PronunciationRecorder.jsx';
import ChatWidget from '../features/ChatWidget.jsx';
import ChapterFeedback from '../features/ChapterFeedback.jsx';
import VoiceCommandBar from '../features/VoiceCommandBar.jsx';
import { useWordSync } from '../../hooks/useWordSync.js';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';
import {
  queueDesktopProgress,
  getCachedAudioPath,
  cacheChapterAudio,
  isDesktop,
} from '../../services/desktopBridge.js';

function PlayerPage() {
  const { id } = useParams();
  const { accessToken } = useAuth();

  const [chapters, setChapters] = useState([]);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [progressByChapter, setProgressByChapter] = useState({});
  const [words, setWords] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioSrc, setAudioSrc] = useState(null);
  const [playbackVolume, setPlaybackVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiRequest(`/api/audiobooks/${id}/chapters`),
      apiRequest('/api/user/progress', { token: accessToken }),
    ])
      .then(([chapterList, progressList]) => {
        setChapters(chapterList);
        setChapterIndex(0);
        setProgressByChapter(Object.fromEntries(progressList.map((p) => [p.chapter_id, p])));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, accessToken]);

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

      <VoiceCommandBar context={chapter.transcript} onNextChapter={handleNextChapter} />

      {progressByChapter[chapter.id]?.completed && (
        <ChapterFeedback key={`feedback-${chapter.id}`} chapterId={chapter.id} />
      )}

      <ChatWidget key={`chat-${chapter.id}`} chapterId={chapter.id} />
    </div>
  );
}

export default PlayerPage;
