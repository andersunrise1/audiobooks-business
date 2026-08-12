import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Linking, AppState, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../services/api.js';
import { useAuth } from '../store/AuthContext.jsx';
import { useTheme } from '../store/ThemeContext.jsx';

const FEATURES = [
  'Todos os audiobooks, para sempre (25 hoje, crescendo)',
  'Flashcards ilimitados',
  'Tradução ao clicar em qualquer palavra, ilimitada',
];

// Mirrors packages/web/src/components/pages/PricingPage.jsx, adapted for
// where mobile is actually simpler: this screen only exists inside the
// authenticated stack (there's no anonymous mobile browsing to a pricing
// page the way the website has), so there's no visitor-id/localStorage
// system to port - the logged-in user's own id is used as the Dia 55-56
// pricing_price experiment's subjectId for both the price shown here and
// the price actually charged, which is what keeps the two in sync.
//
// The real purchase still happens in a real browser, same as web - opened
// via Linking.openURL rather than a native in-app browser module, avoiding
// a new native dependency after this session's earlier native-crash
// debugging. There's no custom URL scheme wired up to bring the user
// straight back into a specific screen when they finish (real deep-linking
// work, not attempted here) - instead, an AppState listener refetches the
// user's plan every time the app returns to the foreground while this
// screen is mounted, so coming back from a completed checkout picks up the
// real plan without any extra tap.
export default function PricingScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, accessToken, refreshUser } = useAuth();

  const [priceBrlCents, setPriceBrlCents] = useState(5700);
  const [badge, setBadge] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    apiRequest(`/api/experiments/pricing_price/assignment?subjectId=${user.id}`)
      .then((assignment) => {
        setPriceBrlCents(assignment?.config?.priceBrlCents ?? 5700);
        setBadge(assignment?.config?.badge ?? null);
      })
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshUser().catch(() => {});
    });
    return () => subscription.remove();
  }, [refreshUser]);

  async function handleBuy() {
    setLoading(true);
    setError('');
    try {
      const { url } = await apiRequest('/api/payment/create-checkout-session', {
        method: 'POST',
        token: accessToken,
        body: { subjectId: user.id },
      });
      await Linking.openURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

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
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}

        <Text style={[styles.price, { color: colors.text }]}>
          R$ {(priceBrlCents / 100).toFixed(0)}
          <Text style={[styles.priceSuffix, { color: colors.muted }]}> pagamento único</Text>
        </Text>

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
          <Pressable
            onPress={handleBuy}
            disabled={loading}
            style={[styles.buyButton, loading && styles.buyButtonDisabled]}
          >
            <Text style={styles.buyButtonText}>
              {loading ? 'Abrindo pagamento...' : 'Comprar Vitalício'}
            </Text>
          </Pressable>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
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
  badge: {
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeText: { color: '#0f172a', fontSize: 12, fontWeight: '600' },
  price: { fontSize: 34, fontWeight: 'bold' },
  priceSuffix: { fontSize: 15, fontWeight: 'normal' },
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
  buyButton: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buyButtonDisabled: { opacity: 0.5 },
  buyButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },
  error: { color: '#dc2626', fontSize: 13 },
});
