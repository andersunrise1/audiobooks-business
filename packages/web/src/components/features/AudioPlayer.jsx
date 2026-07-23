import { useRef, useState } from 'react';

const SPEED_OPTIONS = [0.7, 0.8, 1.0, 1.2, 1.5];

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function AudioPlayer({ src, startTime = 0, onTimeUpdate, onEnded }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }

  function handleSeek(event) {
    const time = Number(event.target.value);
    if (audioRef.current) audioRef.current.currentTime = time;
    setCurrentTime(time);
  }

  function handleVolumeChange(event) {
    const value = Number(event.target.value);
    setVolume(value);
    if (audioRef.current) audioRef.current.volume = value;
  }

  function handleSpeedChange(value) {
    setSpeed(value);
    if (audioRef.current) audioRef.current.playbackRate = value;
  }

  function handleLoadedMetadata() {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration);
    if (startTime) audio.currentTime = startTime;
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    onTimeUpdate?.(audio.currentTime, audio.duration);
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4 flex flex-col gap-3">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          setIsPlaying(false);
          onEnded?.();
        }}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-slate-900 text-white"
          aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <span className="text-sm text-slate-500 tabular-nums shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={handleSeek}
          className="flex-1"
          aria-label="Progresso"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
        <label className="flex items-center gap-2">
          Volume
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={handleVolumeChange}
            className="w-24"
            aria-label="Volume"
          />
        </label>

        <div className="flex items-center gap-1">
          Velocidade
          {SPEED_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleSpeedChange(option)}
              className={`px-2 py-1 rounded ${
                speed === option ? 'bg-slate-900 text-white' : 'bg-slate-100'
              }`}
            >
              {option}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AudioPlayer;
