import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
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

// Tap-to-seek bar with zero native dependency (no @react-native-community/
// slider) - that package was pulled after a real device reported the app
// crashing on open right after it was added; a plain View-based track is
// lower-risk than debugging a native module blind, with no way to attach a
// debugger or read a crash log from this environment. Drag-to-seek is
// traded for tap-to-seek as the honest cost of that tradeoff.
function SeekBar({ currentTime, duration, onSeek }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const progress = duration > 0 ? Math.min(Math.max(currentTime / duration, 0), 1) : 0;

  function handlePress(event) {
    if (!trackWidth || !duration) return;
    const ratio = Math.min(Math.max(event.nativeEvent.locationX / trackWidth, 0), 1);
    onSeek(ratio * duration);
  }

  return (
    <Pressable
      style={styles.seekTrackWrap}
      onPress={handlePress}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      hitSlop={8}
    >
      <View style={styles.seekTrack}>
        <View style={[styles.seekTrackFill, { width: `${progress * 100}%` }]} />
      </View>
    </Pressable>
  );
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
  //
  // Real device bug found here: these two effects fired on every single
  // mount, writing playbackRate/loop onto the native player immediately -
  // including chapters with no audio at all (`useAudioPlayer(undefined)`,
  // since the `!src` early return below happens after every hook call, per
  // Rules of Hooks) and, worse, even for chapters *with* real audio: the
  // native player session can still be mid-initialization the instant this
  // effect fires (JS returns synchronously; the underlying native
  // AVPlayer/ExoPlayer session does not), so writing to it too early can
  // throw natively. That matches the exact bug reported: the screen closing
  // instantly on tapping *any* book, before any network data even had time
  // to load. `status.isLoaded` (mirrors player.isLoaded) is expo-audio's own
  // "safe to touch" signal - both effects now wait for it.
  // try/catch belt-and-suspenders on top of the isLoaded guard: this
  // environment has no way to attach a debugger or read a native crash log
  // from a real device, so a failure here degrading to "speed/repeat
  // silently doesn't apply" is far preferable to it taking the whole app
  // down again.
  useEffect(() => {
    if (!src || !status.isLoaded) return;
    try {
      // eslint-disable-next-line react-hooks/immutability
      player.playbackRate = speed;
    } catch (err) {
      console.error('failed to set playback rate', err);
    }
  }, [player, speed, src, status.isLoaded]);

  useEffect(() => {
    if (!src || !status.isLoaded) return;
    try {
      // eslint-disable-next-line react-hooks/immutability
      player.loop = repeat;
    } catch (err) {
      console.error('failed to set loop', err);
    }
  }, [player, repeat, src, status.isLoaded]);

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
        <SeekBar
          currentTime={status.currentTime ?? 0}
          duration={status.duration ?? 0}
          onSeek={(value) => player.seekTo(value)}
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
  seekTrackWrap: { flex: 1, justifyContent: 'center', paddingVertical: 10 },
  seekTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#44403c',
    overflow: 'hidden',
  },
  seekTrackFill: { height: '100%', backgroundColor: '#2563eb' },
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
