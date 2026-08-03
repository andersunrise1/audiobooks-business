import RobotLogo from './RobotLogo.jsx';

// Shared "TECHSPEAKING" brand mark (robot mascot + styled wordmark) used
// anywhere the brand needs to appear consistently - currently Navbar and
// HomePage. size/className let each usage control text/icon scale without
// duplicating the red/blue/white styling itself.
//
// Fixed brand colors (TEC red, HSPE blue, AKING white), not the
// user-customizable --color-primary token - same reasoning as RobotLogo's
// hardcoded blue eyes: the mark's own colors are fixed identity, not meant
// to shift with the reader's chosen accent color.
function TechSpeakWordmark({ className = '', iconClassName = 'w-7 h-7' }) {
  return (
    <span className={`inline-flex items-center gap-1 font-bold neon-text ${className}`}>
      <RobotLogo className={iconClassName} />
      <span>
        <span className="text-red-600 dark:text-red-400">{'TEC'}</span>
        <span className="text-blue-600 dark:text-blue-400">{'HSPE'}</span>
        {/* Dia 70: the dark stroke only earns its keep in light mode,
            where the canvas is white and white-on-white would otherwise
            vanish. In dark mode the canvas is stone-900, where plain
            white already has ~15:1 contrast on its own - keeping the
            stroke there just confused axe-core's contrast checker into
            reading a blended, low-contrast effective color. */}
        <span className="text-white [-webkit-text-stroke:0.6px_rgba(0,0,0,0.6)] dark:[-webkit-text-stroke:0px]">
          {'AKING'}
        </span>
      </span>
    </span>
  );
}

export default TechSpeakWordmark;
