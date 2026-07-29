import { useEffect, useRef, useState } from 'react';

const SPEED_OPTIONS = [0.7, 0.8, 1.0, 1.2, 1.5];
const SKIP_SECONDS = 10;

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function AudioPlayer({
  src,
  startTime = 0,
  onTimeUpdate,
  onEnded,
  volume = 1,
  onVolumeChange,
  speed = 1,
  onSpeedChange,
  onPrevChapter,
  onNextChapter,
  hasPrevChapter = false,
  hasNextChapter = false,
}) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState(false);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }

  // Dia 65: Cmd/Ctrl+P (desktop-only, useKeyboardShortcuts.js) dispatches
  // this instead of calling a prop directly, so the shortcut works without
  // needing to know anything about AudioPlayer's internals - it's a no-op
  // whenever no player is mounted (e.g. not on PlayerPage).
  useEffect(() => {
    window.addEventListener('techspeak:toggle-playback', togglePlay);
    return () => window.removeEventListener('techspeak:toggle-playback', togglePlay);
  }, []);

  function skip(delta) {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Math.min(Math.max(audio.currentTime + delta, 0), duration || Infinity);
    audio.currentTime = next;
    setCurrentTime(next);
  }

  function handleSeek(event) {
    const time = Number(event.target.value);
    if (audioRef.current) audioRef.current.currentTime = time;
    setCurrentTime(time);
  }

  function handleVolumeChange(event) {
    const value = Number(event.target.value);
    onVolumeChange?.(value);
    if (audioRef.current) audioRef.current.volume = value;
  }

  function cycleSpeed() {
    const index = SPEED_OPTIONS.indexOf(speed);
    const next = SPEED_OPTIONS[(index + 1) % SPEED_OPTIONS.length];
    onSpeedChange?.(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  function handleLoadedMetadata() {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration);
    audio.volume = volume;
    audio.playbackRate = speed;
    if (startTime) audio.currentTime = startTime;
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    onTimeUpdate?.(audio.currentTime, audio.duration);
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-stone-700 flex flex-col gap-3 p-3">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        loop={repeat}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          setIsPlaying(false);
          if (!repeat) onEnded?.();
        }}
      />

      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 dark:text-stone-400 tabular-nums shrink-0 w-9">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={handleSeek}
          className="flex-1 h-6 touch-manipulation accent-primary"
          aria-label="Progresso"
        />
        <span className="text-xs text-slate-500 dark:text-stone-400 tabular-nums shrink-0 w-9 text-right">
          {formatTime(duration)}
        </span>
      </div>

      <div className="flex items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={cycleSpeed}
          className="px-2.5 h-9 rounded-full bg-slate-100 dark:bg-stone-700 text-slate-700 dark:text-stone-200 text-sm font-medium touch-manipulation"
          aria-label="Alterar velocidade"
        >
          {speed}x
        </button>

        <button
          type="button"
          onClick={onPrevChapter}
          disabled={!hasPrevChapter}
          className="w-9 h-9 flex items-center justify-center rounded-full text-slate-600 dark:text-stone-300 disabled:opacity-30 touch-manipulation"
          aria-label="Capítulo anterior"
        >
          ⏮
        </button>

        <button
          type="button"
          onClick={() => skip(-SKIP_SECONDS)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-slate-600 dark:text-stone-300 touch-manipulation"
          aria-label={`Voltar ${SKIP_SECONDS} segundos`}
        >
          ⏪10
        </button>

        <button
          type="button"
          onClick={togglePlay}
          className="w-14 h-14 shrink-0 flex items-center justify-center rounded-full bg-primary neon-glow text-white text-xl touch-manipulation"
          aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <button
          type="button"
          onClick={() => skip(SKIP_SECONDS)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-slate-600 dark:text-stone-300 touch-manipulation"
          aria-label={`Avançar ${SKIP_SECONDS} segundos`}
        >
          10⏩
        </button>

        <button
          type="button"
          onClick={onNextChapter}
          disabled={!hasNextChapter}
          className="w-9 h-9 flex items-center justify-center rounded-full text-slate-600 dark:text-stone-300 disabled:opacity-30 touch-manipulation"
          aria-label="Próximo capítulo"
        >
          ⏭
        </button>

        <button
          type="button"
          onClick={() => setRepeat((r) => !r)}
          aria-pressed={repeat}
          className={`w-9 h-9 flex items-center justify-center rounded-full touch-manipulation ${
            repeat ? 'bg-primary/20 text-primary' : 'text-slate-600 dark:text-stone-300'
          }`}
          aria-label="Repetir capítulo"
        >
          🔁
        </button>
      </div>

      <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-stone-400 justify-center">
        Volume
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={handleVolumeChange}
          className="w-24 h-6 touch-manipulation accent-primary"
          aria-label="Volume"
        />
      </label>
    </div>
  );
}

export default AudioPlayer;
