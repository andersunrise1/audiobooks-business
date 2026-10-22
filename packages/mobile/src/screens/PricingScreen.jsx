import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIAP } from 'expo-iap';
import { apiRequest } from '../services/api.js';
import { useAuth } from '../store/AuthContext.jsx';
import { useTheme } from '../store/ThemeContext.jsx';

// Must match googlePlayService.js's LIFETIME_PRODUCT_ID exactly, and the
// product id configured in Play Console (GOOGLE_PLAY_BILLING.md).
const LIFETIME_PRODUCT_ID = 'techspeak_vitalicio';

const FEATURES = [
  'Todos os audiobooks, para sempre (25 hoje, crescendo)',
  'Flashcards ilimitados',
  'Tradução ao clicar em qualquer palavra, ilimitada',
];

// Buys through Google Play Billing (expo-iap), not Mercado Pago - a Play
// Store policy requirement for digital content purchased inside an Android
// app (see CLAUDE.md's "Google Play Billing" entry). The website
// (PricingPage.jsx) keeps selling via Mercado Pago unaffected; either path
// sets the same users.plan = 'pro', so access is shared regardless of which
// one a customer used.
//
// Real consequence of this: Dia 55-56's pricing_price A/B test (web's
// PricingPage shows R$57 vs R$47 depending on experiment variant) can't
// apply here - an in-app product's price is fixed in Play Console, Google
// charges and localizes it, and our code never sees or controls that
// amount. So this screen shows whatever Google itself reports as the
// product's real price (product.displayPrice) once fetched, rather than a
// number our own backend decided - it's the only number guaranteed to
// match what's actually charged.
export default function PricingScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, accessToken, refreshUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { connected, products, fetchProducts, requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: (purchase) => grantAndFinish(purchase),
    onPurchaseError: (err) => {
      setError(err?.message || 'Não foi possível concluir a compra.');
      setLoading(false);
    },
  });

  useEffect(() => {
    if (Platform.OS !== 'android' || !connected) return;
    fetchProducts({ skus: [LIFETIME_PRODUCT_ID], type: 'in-app' }).catch(() => {});
  }, [connected, fetchProducts]);

  // Sends the purchase token to the backend for real server-side
  // verification against the Android Publisher API (never trusts the
  // client's own claim that it paid) before granting access - mirrors what
  // the Mercado Pago webhook does for the web path. finishTransaction only
  // runs after that verification succeeds, since Google expects an
  // acknowledgement either way and this project's backend is the one
  // source of truth for whether the purchase was actually valid.
  const grantAndFinish = useCallback(
    async (purchase) => {
      try {
        await apiRequest('/api/payment/google-play/verify', {
          method: 'POST',
          token: accessToken,
          body: { purchaseToken: purchase.purchaseToken },
        });
        await finishTransaction({ purchase, isConsumable: false });
        await refreshUser();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [accessToken, finishTransaction, refreshUser],
  );

  async function handleBuy() {
    if (Platform.OS !== 'android') {
      setError('A compra pelo app só está disponível no Android, por enquanto.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await requestPurchase({
        request: { google: { skus: [LIFETIME_PRODUCT_ID] } },
        type: 'in-app',
      });
      // The actual result (success or failure) arrives via the
      // onPurchaseSuccess/onPurchaseError callbacks passed to useIAP above,
      // not as this call's own resolution.
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  const alreadyOwns = user?.plan === 'pro';
  const product = products.find((p) => p.id === LIFETIME_PRODUCT_ID);
  const displayPrice = product?.displayPrice ?? 'R$ 57';

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
        <Text style={[styles.price, { color: colors.text }]}>
          {displayPrice}
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
              {loading ? 'Processando compra...' : 'Comprar Vitalício'}
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
