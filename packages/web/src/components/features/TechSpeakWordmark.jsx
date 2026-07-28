import RobotLogo from './RobotLogo.jsx';

// Shared "TechSpeak" brand mark (robot mascot + styled wordmark) used
// anywhere the brand needs to appear consistently - currently Navbar and
// HomePage. size/className let each usage control text/icon scale without
// duplicating the red/blue/white styling itself.
function TechSpeakWordmark({ className = '', iconClassName = 'w-7 h-7' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-bold text-primary neon-text ${className}`}
    >
      <RobotLogo className={iconClassName} />
      <span>
        {'TechSpe'}
        {/* Dia 70: the dark stroke only earns its keep in light mode,
            where the canvas is white and white-on-white would otherwise
            vanish. In dark mode the canvas is stone-900, where plain
            white already has ~15:1 contrast on its own - keeping the
            stroke there just confused axe-core's contrast checker into
            reading a blended, low-contrast effective color. */}
        <span className="text-white [-webkit-text-stroke:0.6px_rgba(0,0,0,0.6)] dark:[-webkit-text-stroke:0px]">
          {'ak'}
        </span>
      </span>
    </span>
  );
}

export default TechSpeakWordmark;
