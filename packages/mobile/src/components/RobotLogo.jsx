import Svg, { Rect, Circle, Ellipse } from 'react-native-svg';

// Direct port of packages/web/src/components/features/RobotLogo.jsx's SVG
// paths (same viewBox, same shapes) - the app was showing a generic 🤖
// emoji everywhere instead of the real brand mascot (real device feedback).
// `dark` picks the same lighter red-400/red-700 shades web uses in dark
// mode instead of red-600/red-800, since a fixed light-mode shade reads too
// dark against a black background.
export default function RobotLogo({ size = 56, dark = false }) {
  const red = dark ? '#ef4444' : '#dc2626';
  const darkRed = dark ? '#b91c1c' : '#991b1b';

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect x="30" y="6" width="4" height="10" fill={red} />
      <Circle cx="32" cy="6" r="4" fill={red} />
      <Circle cx="11" cy="32" r="6" fill={red} />
      <Circle cx="53" cy="32" r="6" fill={red} />
      <Rect x="12" y="16" width="40" height="36" rx="14" fill={red} />
      <Rect x="19" y="26" width="26" height="16" rx="8" fill={darkRed} />
      <Ellipse cx="26" cy="34" rx="4.5" ry="6" fill="#ffffff" />
      <Ellipse cx="38" cy="34" rx="4.5" ry="6" fill="#ffffff" />
      <Rect x="27" y="46" width="10" height="3" rx="1.5" fill={darkRed} />
    </Svg>
  );
}
