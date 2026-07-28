import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../store/AuthContext.jsx';

// Placeholder landing screen, proving the auth-gated stack switch works
// end-to-end. Real screens (audiobook catalog, player, flashcards,
// dashboard) are Dia 86-90's job ("Port Features"), not this setup day's.
export default function HomeScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Olá, {user?.name || user?.email}</Text>
      <Text style={styles.subtitle}>TechSpeak mobile - em construção</Text>

      <Pressable style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#64748b' },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
