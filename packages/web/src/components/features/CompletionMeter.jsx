// A single-ratio meter (chapters completed vs total, across every audiobook
// in progress) rendered as a ring: same-hue fill against a neutral track,
// per dataviz convention for "one ratio against a limit" - deliberately not
// a pie/donut (a 2-slice pie is a documented anti-pattern; the meter is the
// correct form here, just circular instead of linear to match this
// dashboard's requested visual style).
function CompletionMeter({ percent, label }) {
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            className="text-slate-200 dark:text-stone-700"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            stroke="var(--color-primary)"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="dark:[filter:drop-shadow(0_0_6px_rgba(var(--color-primary-glow),0.7))] transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold">{clamped}%</span>
        </div>
      </div>
      <span className="text-sm text-slate-500 dark:text-stone-400 text-center">{label}</span>
    </div>
  );
}

export default CompletionMeter;
