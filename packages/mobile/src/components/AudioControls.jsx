import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

// A guarded wrapper for every direct native player call, not just the two
// that were already suspected - a real device kept crashing on tapping
// *any* book even after gating the playbackRate/loop effects on
// status.isLoaded, so this is a broader, more conservative pass: no native
// property is ever touched automatically (on mount, on a prop change, in
// any effect) - only in direct response to the user tapping a control,
// mirroring togglePlay's plain player.play()/pause(), the one call that
// has never been implicated in a crash across every build so far.
function safeCall(action, label) {
  try {
    action();
  } catch (err) {
    console.error(`AudioControls: failed to ${label}`, err);
  }
}

// Direct port of packages/web/src/components/features/AudioPlayer.jsx's
// control set (seek bar, speed cycle, skip ±10s, play/pause, prev/next
// chapter, repeat) - the mobile player previously only had a play/pause
// button, which real device feedback called out as not matching the site.
// Fixed to the bottom, always black regardless of the app's light/dark
// toggle - same deliberate choice web's own player bar makes.
//
// Remounted per chapter (`key={chapter.id}` in PlayerScreen). Speed is
// still a controlled prop (lifted to PlayerScreen) so the *chosen* value
// survives a chapter switch even though each new player instance starts at
// native default - togglePlay re-applies it the moment playback starts,
// so it's never silently ignored, just applied a beat later than before.
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
  const insets = useSafeAreaInsets();
  const player = useAudioPlayer(src ?? undefined);
  const status = useAudioPlayerStatus(player);
  const [repeat, setRepeat] = useState(false);

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
    if (status.playing) {
      safeCall(() => player.pause(), 'pause');
      return;
    }
    // Applied here, right before play(), instead of an effect on mount -
    // this is a direct user-gesture-triggered native call, the same
    // pattern play()/pause() already use safely.
    safeCall(() => {
      player.playbackRate = speed;
      player.loop = repeat;
    }, 'apply speed/loop before play');
    safeCall(() => player.play(), 'play');
  }

  function skip(delta) {
    const duration = status.duration || Infinity;
    const next = Math.min(Math.max((status.currentTime ?? 0) + delta, 0), duration);
    safeCall(() => player.seekTo(next), 'seek');
  }

  // Real device bug: gating these on `status.playing` (as togglePlay's own
  // "only mutate right before play()" pattern suggested) meant tapping the
  // speed/repeat button while paused updated the *displayed* label but
  // never actually told the native player - so resuming playback kept the
  // previous rate/loop value while the UI already showed the new one
  // (reported: "0.7x" visibly selected but audio still playing at the old,
  // faster rate). Web's <audio loop={repeat}> is declarative and never had
  // this gap; expo-audio's imperative properties need every change applied
  // unconditionally, same as web's own audioRef.current.playbackRate
  // assignment in cycleSpeed, which has no such guard either.
  function cycleSpeed() {
    const index = SPEED_OPTIONS.indexOf(speed);
    const next = SPEED_OPTIONS[(index + 1) % SPEED_OPTIONS.length];
    onSpeedChange?.(next);
    safeCall(() => {
      player.playbackRate = next;
    }, 'change speed');
  }

  function toggleRepeat() {
    const next = !repeat;
    setRepeat(next);
    safeCall(() => {
      player.loop = next;
    }, 'change loop');
  }

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.seekRow}>
        <Text style={styles.time}>{formatTime(status.currentTime)}</Text>
        <SeekBar
          currentTime={status.currentTime ?? 0}
          duration={status.duration ?? 0}
          onSeek={(value) => skip(value - (status.currentTime ?? 0))}
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
          onPress={toggleRepeat}
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
