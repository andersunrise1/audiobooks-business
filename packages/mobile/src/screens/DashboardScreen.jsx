import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
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

export default function DashboardScreen() {
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

      {stats && (
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
            hint={`${stats.wordsLearned.week} nesta semana`}
            accent="amber"
            colors={colors}
          />
          <StatCard
            label="Flashcards a revisar"
            value={stats.flashcardsDue}
            accent="pink"
            colors={colors}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  title: { fontSize: 22, fontWeight: 'bold' },
  error: { color: '#dc2626' },
  offlineNotice: { color: '#d97706', fontSize: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '47%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  statLabel: { fontSize: 12, color: '#64748b' },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statHint: { fontSize: 11, color: '#94a3b8' },
});
