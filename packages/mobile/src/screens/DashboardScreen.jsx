import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { apiRequest } from '../services/api.js';
import { useAuth } from '../store/AuthContext.jsx';
import { getCachedStats, cacheStats } from '../services/offlineCache.js';

function StatCard({ label, value, hint }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {hint && <Text style={styles.statHint}>{hint}</Text>}
    </View>
  );
}

export default function DashboardScreen() {
  const { user, accessToken } = useAuth();
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Olá, {user?.name || user?.email}</Text>

      {loading && <ActivityIndicator size="large" />}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {offline && (
        <Text style={styles.offlineNotice}>
          Offline — mostrando estatísticas da última sincronização.
        </Text>
      )}

      {stats && (
        <View style={styles.statsGrid}>
          <StatCard label="Streak" value={`${stats.streakDays} dia(s)`} />
          <StatCard label="Tempo estudado" value={`${stats.totalStudyMinutes} min`} />
          <StatCard
            label="Palavras hoje"
            value={stats.wordsLearned.today}
            hint={`${stats.wordsLearned.week} nesta semana`}
          />
          <StatCard label="Flashcards a revisar" value={stats.flashcardsDue} />
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
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  statLabel: { fontSize: 12, color: '#64748b' },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statHint: { fontSize: 11, color: '#94a3b8' },
});
