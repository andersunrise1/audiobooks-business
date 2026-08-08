import { View, Text, StyleSheet } from 'react-native';
import RobotLogo from './RobotLogo.jsx';

// Direct port of packages/web/src/components/features/TechSpeakWordmark.jsx:
// same TEC (red) / HSPE (blue) / AKING (white/black) split, same fixed
// brand colors regardless of the reader's chosen accent color. Real device
// feedback: the login screen was showing a generic 🤖 emoji + "TechSpeak"
// instead of this real mark.
//
// `forceDark`: TopNavBar's bar is always black (mirrors the web Navbar's
// own "always black" choice) regardless of the app's light/dark toggle, so
// it always needs the dark-mode color set; Login/Register instead follow
// the real theme via `dark`.
export default function TechSpeakWordmark({
  logoSize = 28,
  fontSize = 20,
  dark = false,
  showIcon = true,
}) {
  const tecColor = dark ? '#f87171' : '#dc2626';
  const hspeColor = dark ? '#60a5fa' : '#2563eb';
  const akingColor = dark ? '#ffffff' : '#0f172a';

  return (
    <View style={styles.row}>
      {showIcon && <RobotLogo size={logoSize} dark={dark} />}
      <Text style={{ fontSize, fontWeight: '800' }}>
        <Text style={{ color: tecColor }}>TEC</Text>
        <Text style={{ color: hspeColor }}>HSPE</Text>
        <Text style={{ color: akingColor }}>AKING</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
