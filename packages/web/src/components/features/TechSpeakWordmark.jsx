import RobotLogo from './RobotLogo.jsx';

// Shared "TechSpeak" brand mark (robot mascot + styled wordmark) used
// anywhere the brand needs to appear consistently - currently Navbar and
// HomePage. size/className let each usage control text/icon scale without
// duplicating the red/blue/white styling itself.
function TechSpeakWordmark({ className = '', iconClassName = 'w-7 h-7' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 neon-text ${className}`}
    >
      <RobotLogo className={iconClassName} />
      <span>
        {'TechSpe'}
        <span className="text-white [-webkit-text-stroke:0.6px_rgba(0,0,0,0.6)]">{'ak'}</span>
      </span>
    </span>
  );
}

export default TechSpeakWordmark;
