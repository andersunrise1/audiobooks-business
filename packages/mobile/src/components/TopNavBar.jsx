import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../store/AuthContext.jsx';
import { useTheme } from '../store/ThemeContext.jsx';
import TechSpeakWordmark from './TechSpeakWordmark.jsx';

const TABS = [
  { key: 'Audiobooks', label: 'Audiobooks', icon: '🎧' },
  { key: 'Flashcards', label: 'Flashcards', icon: '🗂️' },
  { key: 'Dashboard', label: 'Dashboard', icon: '📊' },
];

// Mirrors packages/web/src/components/layout/Navbar.jsx's model: one top
// bar with the brand mark, theme/logout controls, and the tab links - always
// black regardless of the app's light/dark toggle, the same deliberate
// choice the web navbar makes. Replaces a native bottom tab bar per direct
// device feedback ("mesmo modelo de interface" do site). Screens are
// switched manually (see AppNavigator's MainTabs) rather than through
// react-navigation's own tab bar, avoiding the kind of RN-Web positioning
// quirks already hit once this session (TranslationModal's animationType
// bug) for a component this layout-sensitive.
export default function TopNavBar({ active, onChange, navigation }) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { theme, cycleTheme } = useTheme();
  const nextIcon = { light: '🌙', dark: '💻', system: '☀️' }[theme];
  const isPro = user?.plan === 'pro';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.brandRow}>
        <TechSpeakWordmark logoSize={26} fontSize={19} dark />
        <View style={styles.actions}>
          {isPro ? (
            <View style={styles.planBadgePro}>
              <Text style={styles.planBadgeProText}>Vitalício</Text>
            </View>
          ) : (
            <Pressable
              onPress={() => navigation.navigate('Pricing')}
              hitSlop={4}
              style={styles.planBadgeUpgrade}
            >
              <Text style={styles.planBadgeUpgradeText}>Upgrade</Text>
            </Pressable>
          )}
          <Pressable onPress={cycleTheme} hitSlop={12}>
            <Text style={styles.actionIcon}>{nextIcon}</Text>
          </Pressable>
          <Pressable onPress={logout} hitSlop={12}>
            <Text style={styles.logoutText}>Sair</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.tabsRow}>
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#292524',
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  actionIcon: { fontSize: 17 },
  planBadgePro: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  planBadgeProText: { color: '#4ade80', fontSize: 11, fontWeight: '700' },
  planBadgeUpgrade: {
    backgroundColor: '#fde68a',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  planBadgeUpgradeText: { color: '#0f172a', fontSize: 11, fontWeight: '700' },
  logoutText: { color: '#60a5fa', fontSize: 14, fontWeight: '600' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 8 },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#2563eb' },
  tabIcon: { fontSize: 18 },
  tabLabel: { color: '#a8a29e', fontSize: 12, fontWeight: '600' },
  tabLabelActive: { color: '#ffffff' },
});
