import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { apiRequest } from '../services/api.js';
import { useAuth } from '../store/AuthContext.jsx';
import { useTheme } from '../store/ThemeContext.jsx';

export default function AudiobookListScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const isPro = user?.plan === 'pro';
  const [audiobooks, setAudiobooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/api/audiobooks')
      .then(setAudiobooks)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      data={audiobooks}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<Text style={styles.muted}>Nenhum audiobook cadastrado ainda.</Text>}
      renderItem={({ item }) => (
        <Pressable
          style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.navigate('Player', { audiobookId: item.id, title: item.title })}
        >
          {item.cover_image_url ? (
            <Image source={{ uri: item.cover_image_url }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Text style={styles.coverPlaceholderText}>📖</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
            {item.level && (
              <Text style={[styles.muted, { color: colors.muted }]}>{item.level}</Text>
            )}
          </View>
          {!item.is_free && !isPro && <Text accessibilityLabel="Exclusivo do Vitalício">🔒</Text>}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    gap: 8,
  },
  title: { fontSize: 16, fontWeight: '600' },
  muted: { color: '#64748b', fontSize: 13 },
  error: { color: '#dc2626' },
  cover: { width: 48, height: 64, borderRadius: 6 },
  coverPlaceholder: { backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  coverPlaceholderText: { fontSize: 22 },
});
