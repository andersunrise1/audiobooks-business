// Each card is a distinct, independent metric (not steps of one ordered
// scale), so a fixed categorical accent per card is the correct color job
// here - unlike WordsLearnedBarChart's single ordered ramp, mixing hues
// across these tiles is intentional, not a rainbow-on-magnitude mistake.
const ACCENTS = {
  purple: 'border-l-purple-600 dark:border-l-purple-400',
  blue: 'border-l-blue-600 dark:border-l-blue-400',
  amber: 'border-l-amber-500 dark:border-l-amber-400',
  pink: 'border-l-pink-500 dark:border-l-pink-400',
};

function StatCard({ label, value, hint, accent = 'blue' }) {
  return (
    <div
      className={`rounded-lg border border-slate-200 dark:border-stone-700 border-l-4 ${ACCENTS[accent]} p-4 flex flex-col gap-1`}
    >
      <span className="text-sm text-slate-500 dark:text-stone-400">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
      {hint && <span className="text-xs text-slate-500 dark:text-stone-400">{hint}</span>}
    </div>
  );
}

export default StatCard;
