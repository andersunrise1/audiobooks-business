import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../store/AuthContext.jsx';
import { useTheme } from '../store/ThemeContext.jsx';

const FEATURES = [
  'Todos os audiobooks, para sempre (25 hoje, crescendo)',
  'Flashcards ilimitados',
  'Tradução ao clicar em qualquer palavra, ilimitada',
];

// Metro resolves this file instead of PricingScreen.jsx when bundling for
// web (the mobile-web preview used throughout this project for
// verification) - expo-iap's useIAP hook has no web implementation and
// throws an uncaught "Cannot find native module 'ExpoIap'" from its own
// internal listener setup the moment it mounts, even before any purchase is
// attempted. Since Google Play Billing genuinely can't work on web anyway
// (there's no Play Store there), this variant skips expo-iap entirely
// rather than trying to suppress its error - same split the project
// reaches for whenever a feature is real-device-only (see PronunciationRecorder's
// own "not supported" fallback).
export default function PricingScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();

  const alreadyOwns = user?.plan === 'pro';

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 24 }]}
    >
      <Text style={[styles.title, { color: colors.text }]}>TECHSPEAKING Vitalício</Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        Pagamento único, acesso para sempre.
      </Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.features}>
          {FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
            </View>
          ))}
        </View>

        {alreadyOwns ? (
          <View style={styles.ownedBox}>
            <Text style={styles.ownedText}>Você já tem acesso Vitalício ✓</Text>
          </View>
        ) : (
          <Text style={[styles.webNotice, { color: colors.muted }]}>
            A compra é feita pelo app Android, via Google Play. Abra o TECHSPEAKING no seu celular
            para comprar o Vitalício.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, gap: 6 },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 14 },
  card: {
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  features: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featureCheck: { color: '#16a34a', fontSize: 14 },
  featureText: { fontSize: 14, flex: 1 },
  ownedBox: {
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ownedText: { color: '#15803d', fontWeight: '600' },
  webNotice: { fontSize: 13, lineHeight: 19 },
});
