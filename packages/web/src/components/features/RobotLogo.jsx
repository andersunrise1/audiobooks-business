// Mascot icon for the TechSpeak wordmark: red robot head (US-flag-style
// contrast against the blue "TechSpeak" text) with white eyes - keeping the
// logo itself to red/blue/white - transparent background so it blends into
// the page instead of carrying its own dark backdrop.
function RobotLogo({ className = 'w-7 h-7' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="30" y="6" width="4" height="10" className="fill-red-600 dark:fill-red-500" />
      <circle cx="32" cy="6" r="4" className="fill-red-600 dark:fill-red-500" />

      <circle cx="11" cy="32" r="6" className="fill-red-600 dark:fill-red-500" />
      <circle cx="53" cy="32" r="6" className="fill-red-600 dark:fill-red-500" />

      <rect
        x="12"
        y="16"
        width="40"
        height="36"
        rx="14"
        className="fill-red-600 dark:fill-red-500"
      />

      <rect
        x="19"
        y="26"
        width="26"
        height="16"
        rx="8"
        className="fill-red-800 dark:fill-red-700"
      />

      <ellipse cx="26" cy="34" rx="4.5" ry="6" className="fill-white" />
      <ellipse cx="38" cy="34" rx="4.5" ry="6" className="fill-white" />

      <rect
        x="27"
        y="46"
        width="10"
        height="3"
        rx="1.5"
        className="fill-red-800 dark:fill-red-700"
      />
    </svg>
  );
}

export default RobotLogo;
