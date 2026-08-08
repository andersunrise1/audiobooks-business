import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { apiRequest } from '../services/api.js';
import { useAuth } from '../store/AuthContext.jsx';
import { useTheme } from '../store/ThemeContext.jsx';
import { getCachedStats, cacheStats } from '../services/offlineCache.js';

// Mirrors packages/web/src/components/features/StatCard.jsx's ACCENTS map -
// same colors, same one-metric-per-color mapping, so the mobile dashboard
// doesn't look like a stripped-down grayscale version of the web one.
const ACCENTS = {
  purple: '#9333ea',
  blue: '#2563eb',
  amber: '#f59e0b',
  pink: '#ec4899',
};

// Mirrors AudiobookProgressList.jsx's BAR_COLORS cycle.
const BAR_COLORS = ['#7c3aed', '#f59e0b', '#9333ea', '#2563eb', '#ec4899'];

function StatCard({ label, value, hint, accent, colors }) {
  return (
    <View
      style={[
        styles.statCard,
        {
          borderLeftColor: ACCENTS[accent],
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: ACCENTS[accent] }]}>{value}</Text>
      {hint && <Text style={[styles.statHint, { color: colors.muted }]}>{hint}</Text>}
    </View>
  );
}

// Mirrors RecommendationsFeed.jsx: continue-where-left-off, an unstarted
// suggestion, and the user's best study hour - stacked vertically here
// (web's 3-column grid doesn't fit a phone width).
function RecommendationsFeed({ colors, navigation }) {
  const { accessToken } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    apiRequest('/api/user/recommendations', { token: accessToken })
      .then(setData)
      .catch(() => setData(null));
  }, [accessToken]);

  if (!data) return null;
  const { nextChapter, recommendedAudiobook, bestStudyHour } = data;
  if (!nextChapter && !recommendedAudiobook && !bestStudyHour) return null;

  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Recomendado para você</Text>

      {nextChapter && (
        <Pressable
          style={[styles.recCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() =>
            navigation?.navigate('Player', {
              audiobookId: nextChapter.audiobookId,
              title: nextChapter.audiobookTitle,
            })
          }
        >
          <Text style={[styles.recLabel, { color: colors.muted }]}>Continue de onde parou</Text>
          <Text style={[styles.recTitle, { color: colors.text }]}>
            {nextChapter.audiobookTitle}
          </Text>
          <Text style={[styles.recSubtitle, { color: colors.muted }]}>
            {nextChapter.chapterTitle}
          </Text>
        </Pressable>
      )}

      {recommendedAudiobook && (
        <Pressable
          style={[styles.recCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() =>
            navigation?.navigate('Player', {
              audiobookId: recommendedAudiobook.audiobookId,
              title: recommendedAudiobook.title,
            })
          }
        >
          <Text style={[styles.recLabel, { color: colors.muted }]}>Experimente também</Text>
          <Text style={[styles.recTitle, { color: colors.text }]}>
            {recommendedAudiobook.title}
          </Text>
          {(recommendedAudiobook.category || recommendedAudiobook.level) && (
            <Text style={[styles.recSubtitle, { color: colors.muted }]}>
              {[recommendedAudiobook.category, recommendedAudiobook.level]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}
        </Pressable>
      )}

      {bestStudyHour && (
        <View
          style={[styles.recCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.recLabel, { color: colors.muted }]}>
            Melhor horário para estudar
          </Text>
          <Text style={[styles.recTitle, { color: colors.text }]}>
            {String(bestStudyHour.hour).padStart(2, '0')}h
          </Text>
        </View>
      )}
    </View>
  );
}

// Mirrors WordsLearnedBarChart.jsx's today/week/month ordered ramp.
const CHART_HEIGHT = 100;
const BARS = [
  { key: 'today', label: 'Hoje', color: '#2563eb' },
  { key: 'week', label: 'Esta semana', color: '#6366f1' },
  { key: 'month', label: 'Este mês', color: '#9333ea' },
];

function WordsLearnedBarChart({ wordsLearned, colors }) {
  const max = Math.max(wordsLearned.today, wordsLearned.week, wordsLearned.month, 1);

  return (
    <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Palavras aprendidas</Text>
      <View style={styles.chartRow}>
        {BARS.map((bar) => {
          const value = wordsLearned[bar.key];
          const barHeight = (value / max) * CHART_HEIGHT;
          return (
            <View key={bar.key} style={styles.chartCol}>
              <Text style={[styles.chartValue, { color: colors.text }]}>{value}</Text>
              <View style={styles.chartTrack}>
                <View
                  style={[styles.chartBar, { height: barHeight, backgroundColor: bar.color }]}
                />
              </View>
              <Text style={[styles.chartLabel, { color: colors.muted }]}>{bar.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// Mirrors CompletionMeter.jsx: same ring math (circumference/offset), using
// react-native-svg instead of raw SVG.
function CompletionMeter({ percent, colors }) {
  const size = 120;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <View style={styles.meterWrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            stroke={colors.border}
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            stroke="#2563eb"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            rotation={-90}
            originX={size / 2}
            originY={size / 2}
          />
        </Svg>
        <View style={styles.meterCenter}>
          <Text style={[styles.meterText, { color: colors.text }]}>{clamped}%</Text>
        </View>
      </View>
    </View>
  );
}

function AudiobookProgressList({ audiobooks, colors, navigation }) {
  if (audiobooks.length === 0) {
    return (
      <Text style={[styles.muted, { color: colors.muted }]}>
        Nenhum audiobook em progresso ainda.
      </Text>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {audiobooks.map((book, index) => {
        const percent =
          book.chaptersTotal > 0
            ? Math.round((book.chaptersStarted / book.chaptersTotal) * 100)
            : 0;
        const barColor = BAR_COLORS[index % BAR_COLORS.length];

        return (
          <Pressable
            key={book.audiobookId}
            style={[styles.progressItem, { borderColor: colors.border }]}
            onPress={() =>
              navigation?.navigate('Player', {
                audiobookId: book.audiobookId,
                title: book.title,
              })
            }
          >
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTitle, { color: colors.text }]} numberOfLines={1}>
                {book.title}
              </Text>
              <Text style={[styles.progressMeta, { color: colors.muted }]}>
                {book.chaptersStarted}/{book.chaptersTotal} · {percent}%
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={[styles.progressFill, { width: `${percent}%`, backgroundColor: barColor }]}
              />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function overallCompletionPercent(audiobooksInProgress) {
  const totals = audiobooksInProgress.reduce(
    (acc, book) => ({
      started: acc.started + book.chaptersStarted,
      total: acc.total + book.chaptersTotal,
    }),
    { started: 0, total: 0 },
  );
  return totals.total > 0 ? Math.round((totals.started / totals.total) * 100) : 0;
}

export default function DashboardScreen({ navigation, onSelectTab }) {
  const { user, accessToken } = useAuth();
  const { colors } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    apiRequest('/api/user/stats', { token: accessToken })
      .then((data) => {
        setOffline(false);
        setStats(data);
        cacheStats(data);
      })
      .catch(async (err) => {
        const cached = await getCachedStats();
        if (cached) {
          setOffline(true);
          setStats(cached);
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      style={{ backgroundColor: colors.background }}
    >
      <Text style={[styles.title, { color: colors.text }]}>Olá, {user?.name || user?.email}</Text>

      {loading && <ActivityIndicator size="large" />}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {offline && (
        <Text style={styles.offlineNotice}>
          Offline — mostrando estatísticas da última sincronização.
        </Text>
      )}

      <RecommendationsFeed colors={colors} navigation={navigation} />

      {stats && (
        <>
          <View style={styles.statsGrid}>
            <StatCard
              label="Streak"
              value={`${stats.streakDays} dia(s)`}
              accent="purple"
              colors={colors}
            />
            <StatCard
              label="Tempo estudado"
              value={`${stats.totalStudyMinutes} min`}
              accent="blue"
              colors={colors}
            />
            <StatCard
              label="Palavras hoje"
              value={stats.wordsLearned.today}
              hint={`${stats.wordsLearned.week} nesta semana · ${stats.wordsLearned.month} neste mês`}
              accent="amber"
              colors={colors}
            />
            <Pressable onPress={() => onSelectTab?.('Flashcards')} style={{ width: '47%' }}>
              <StatCard
                label="Flashcards a revisar"
                value={stats.flashcardsDue}
                accent="pink"
                colors={colors}
              />
            </Pressable>
          </View>

          <WordsLearnedBarChart wordsLearned={stats.wordsLearned} colors={colors} />

          <View
            style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <CompletionMeter
              percent={overallCompletionPercent(stats.audiobooksInProgress)}
              colors={colors}
            />
            <Text style={[styles.meterCaption, { color: colors.muted }]}>
              Progresso geral dos audiobooks em andamento
            </Text>
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 12 }]}>
              Audiobooks em progresso
            </Text>
            <AudiobookProgressList
              audiobooks={stats.audiobooksInProgress}
              colors={colors}
              navigation={navigation}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  title: { fontSize: 22, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  error: { color: '#dc2626' },
  offlineNotice: { color: '#d97706', fontSize: 12 },
  muted: { fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '47%',
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statHint: { fontSize: 11 },
  recCard: { borderWidth: 1, borderRadius: 10, padding: 14, gap: 2 },
  recLabel: { fontSize: 11 },
  recTitle: { fontSize: 15, fontWeight: '700' },
  recSubtitle: { fontSize: 13 },
  panel: { borderWidth: 1, borderRadius: 10, padding: 16, gap: 4 },
  chartRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 8 },
  chartCol: { alignItems: 'center', gap: 6, width: 64 },
  chartValue: { fontSize: 14, fontWeight: '700' },
  chartTrack: { height: CHART_HEIGHT, width: 24, justifyContent: 'flex-end' },
  chartBar: { width: '100%', borderRadius: 4 },
  chartLabel: { fontSize: 11, textAlign: 'center' },
  meterWrap: { alignItems: 'center' },
  meterCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meterText: { fontSize: 24, fontWeight: 'bold' },
  meterCaption: { fontSize: 13, textAlign: 'center', marginTop: 4 },
  progressItem: { borderWidth: 1, borderRadius: 8, padding: 10, gap: 6 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  progressTitle: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  progressMeta: { fontSize: 12 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
});
