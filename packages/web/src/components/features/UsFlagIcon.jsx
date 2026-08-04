// A drawn SVG US flag, not the Unicode 🇺🇸 emoji - Windows intentionally
// renders flag emoji as two-letter country codes ("US") instead of a
// pictorial flag (unlike Android/iOS/macOS), so the emoji never looks like
// a flag for a meaningful share of users. An inline SVG renders identically
// everywhere, same reasoning as RobotLogo.jsx being a drawn icon rather
// than relying on emoji/platform fonts.
function UsFlagIcon({ className = 'w-5 h-4' }) {
  const stripeHeight = 16 / 13;
  const stripes = Array.from({ length: 13 }, (_, i) => (
    <rect
      key={i}
      x={0}
      y={i * stripeHeight}
      width={24}
      height={stripeHeight}
      fill={i % 2 === 0 ? '#B22234' : '#FFFFFF'}
    />
  ));

  const starRows = [0, 1, 2, 3, 4];
  const stars = starRows.flatMap((row) =>
    Array.from({ length: row % 2 === 0 ? 3 : 2 }, (_, col) => (
      <circle
        key={`${row}-${col}`}
        cx={row % 2 === 0 ? 1.6 + col * 2.8 : 3 + col * 2.8}
        cy={0.9 + row * 1.7}
        r={0.5}
        fill="#FFFFFF"
      />
    )),
  );

  return (
    <svg viewBox="0 0 24 16" className={className} role="img" aria-label="Bandeira dos EUA">
      {stripes}
      <rect x={0} y={0} width={9.6} height={stripeHeight * 7} fill="#3C3B6E" />
      {stars}
    </svg>
  );
}

export default UsFlagIcon;
