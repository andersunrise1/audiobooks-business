import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useAuth } from '../store/AuthContext.jsx';
import { useTheme } from '../store/ThemeContext.jsx';
import RobotLogo from '../components/RobotLogo.jsx';
import TechSpeakWordmark from '../components/TechSpeakWordmark.jsx';

// No explicit navigation to a "logged in" screen on success: AppNavigator
// swaps the entire stack based on isAuthenticated, the same pattern the web
// app uses route guards for.
//
// Full useTheme() integration was missing entirely here (real bug found on
// a live device: dark-mode text defaulted to black-on-black, invisible) -
// every color below is explicit. The brand mark uses the real RobotLogo +
// TECHSPEAKING wordmark (was a generic 🤖 emoji + "TechSpeak" text - real
// device feedback caught this looked like a different, unbranded app).
// KeyboardAvoidingView + ScrollView fix a second real device bug: the
// keyboard covered the password field and the Entrar button with no way to
// scroll past it.
export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <RobotLogo size={72} dark={isDark} />
          <TechSpeakWordmark fontSize={26} dark={isDark} showIcon={false} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Entrar</Text>

        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
          ]}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
          ]}
          placeholder="Senha"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Senha"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>{submitting ? 'Entrando...' : 'Entrar'}</Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Register')}>
          <Text style={[styles.link, { color: colors.muted }]}>Não tem conta? Criar conta</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 12 },
  brand: { alignItems: 'center', marginBottom: 16, gap: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: { color: '#dc2626', fontSize: 14 },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600' },
  link: { fontSize: 14, textAlign: 'center', marginTop: 8 },
});
