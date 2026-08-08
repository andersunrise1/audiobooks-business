import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useTheme } from '../store/ThemeContext.jsx';

const SPEED_OPTIONS = [0.7, 0.8, 1.0, 1.2, 1.5];
const SKIP_SECONDS = 10;

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Direct port of packages/web/src/components/features/AudioPlayer.jsx's
// control set (seek bar, speed cycle, skip ±10s, play/pause, prev/next
// chapter, repeat) - the mobile player previously only had a play/pause
// button, which real device feedback called out as not matching the site.
// Fixed to the bottom, always black regardless of the app's light/dark
// toggle - same deliberate choice web's own player bar makes.
//
// Remounted per chapter (`key={chapter.id}` in PlayerScreen), same as
// before - speed is a controlled prop (lifted to PlayerScreen) so it
// survives a chapter switch instead of resetting, matching a real bug web
// itself hit and fixed (Dia 25).
export default function AudioControls({
  src,
  onEnded,
  speed,
  onSpeedChange,
  onPrevChapter,
  onNextChapter,
  hasPrevChapter,
  hasNextChapter,
}) {
  const { colors } = useTheme();
  const player = useAudioPlayer(src ?? undefined);
  const status = useAudioPlayerStatus(player);
  const [repeat, setRepeat] = useState(false);

  // expo-audio's AudioPlayer is a native-module handle, not React state -
  // its own docs show `player.playbackRate = x` as the intended API, which
  // the "no mutating a hook's return value" lint rule (aimed at plain
  // objects/state) doesn't know about.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    player.playbackRate = speed;
  }, [player, speed]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    player.loop = repeat;
  }, [player, repeat]);

  useEffect(() => {
    if (status.didJustFinish && !repeat) onEnded?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish]);

  if (!src) {
    return (
      <Text style={[styles.notAvailable, { color: colors.muted }]}>
        Áudio ainda não disponível para este capítulo.
      </Text>
    );
  }

  function togglePlay() {
    if (status.playing) player.pause();
    else player.play();
  }

  function skip(delta) {
    const duration = status.duration || Infinity;
    const next = Math.min(Math.max((status.currentTime ?? 0) + delta, 0), duration);
    player.seekTo(next);
  }

  function cycleSpeed() {
    const index = SPEED_OPTIONS.indexOf(speed);
    onSpeedChange?.(SPEED_OPTIONS[(index + 1) % SPEED_OPTIONS.length]);
  }

  return (
    <View style={styles.bar}>
      <View style={styles.seekRow}>
        <Text style={styles.time}>{formatTime(status.currentTime)}</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={status.duration || 0}
          value={Math.min(status.currentTime ?? 0, status.duration || 0)}
          onSlidingComplete={(value) => player.seekTo(value)}
          minimumTrackTintColor="#2563eb"
          maximumTrackTintColor="#44403c"
          thumbTintColor="#2563eb"
        />
        <Text style={[styles.time, styles.timeRight]}>{formatTime(status.duration)}</Text>
      </View>

      <View style={styles.controlsRow}>
        <Pressable style={styles.speedButton} onPress={cycleSpeed}>
          <Text style={styles.speedButtonText}>{speed}x</Text>
        </Pressable>

        <Pressable
          style={styles.smallButton}
          onPress={onPrevChapter}
          disabled={!hasPrevChapter}
          hitSlop={8}
        >
          <Text style={[styles.smallButtonText, !hasPrevChapter && styles.disabled]}>⏮</Text>
        </Pressable>

        <Pressable style={styles.smallButton} onPress={() => skip(-SKIP_SECONDS)} hitSlop={8}>
          <Text style={styles.smallButtonText}>⏪10</Text>
        </Pressable>

        <Pressable style={styles.playButton} onPress={togglePlay}>
          <Text style={styles.playButtonText}>{status.playing ? '⏸' : '▶'}</Text>
        </Pressable>

        <Pressable style={styles.smallButton} onPress={() => skip(SKIP_SECONDS)} hitSlop={8}>
          <Text style={styles.smallButtonText}>10⏩</Text>
        </Pressable>

        <Pressable
          style={styles.smallButton}
          onPress={onNextChapter}
          disabled={!hasNextChapter}
          hitSlop={8}
        >
          <Text style={[styles.smallButtonText, !hasNextChapter && styles.disabled]}>⏭</Text>
        </Pressable>

        <Pressable
          style={[styles.smallButton, repeat && styles.repeatActive]}
          onPress={() => setRepeat((r) => !r)}
          hitSlop={8}
        >
          <Text style={styles.smallButtonText}>🔁</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notAvailable: { fontSize: 14, paddingVertical: 8 },
  bar: {
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#292524',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  seekRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  slider: { flex: 1, height: 32 },
  time: { color: '#a8a29e', fontSize: 11, width: 36 },
  timeRight: { textAlign: 'right' },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  speedButton: {
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#292524',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedButtonText: { color: '#e7e5e4', fontSize: 13, fontWeight: '600' },
  smallButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonText: { color: '#e7e5e4', fontSize: 15 },
  disabled: { opacity: 0.3 },
  repeatActive: { backgroundColor: 'rgba(37,99,235,0.25)' },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonText: { color: '#ffffff', fontSize: 22 },
});
