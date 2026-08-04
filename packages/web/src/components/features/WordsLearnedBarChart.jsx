// Today/week/month are nested time windows (month includes week includes
// today), not independent categories - so this is an ordinal progression,
// not identity. Per dataviz convention that calls for a single-hue
// sequential ramp; the two-hue blue->purple gradient here is the
// documented "analogous neighbors" exception (both cool, adjacent hues),
// used because the user specifically asked for a blue/purple gradient feel
// - not a categorical rainbow, since each bar is still one fixed step of
// one ordered ramp, always in the same today->week->month order.
const BARS = [
  {
    key: 'today',
    label: 'Hoje',
    barClass: 'bg-blue-600 dark:bg-blue-400 dark:shadow-[0_0_14px_rgba(96,165,250,0.55)]',
  },
  {
    key: 'week',
    label: 'Esta semana',
    barClass: 'bg-indigo-500 dark:bg-indigo-400 dark:shadow-[0_0_14px_rgba(129,140,248,0.55)]',
  },
  {
    key: 'month',
    label: 'Este mês',
    barClass: 'bg-purple-600 dark:bg-purple-400 dark:shadow-[0_0_14px_rgba(192,132,252,0.55)]',
  },
];

const CHART_HEIGHT = 120;

function WordsLearnedBarChart({ wordsLearned }) {
  const max = Math.max(wordsLearned.today, wordsLearned.week, wordsLearned.month, 1);

  return (
    <div>
      <h3 className="text-sm font-medium text-slate-600 dark:text-stone-300 mb-3">
        Palavras aprendidas
      </h3>
      <div className="flex items-end justify-center gap-6">
        {BARS.map((bar) => {
          const value = wordsLearned[bar.key];
          const barHeight = (value / max) * CHART_HEIGHT;

          return (
            <div key={bar.key} className="flex flex-col items-center gap-1.5 w-16">
              <span className="text-sm font-semibold">{value}</span>
              <div className="w-6 flex items-end" style={{ height: CHART_HEIGHT }}>
                <div
                  className={`w-full rounded-t-[4px] transition-[height] duration-500 ${bar.barClass}`}
                  style={{ height: barHeight }}
                />
              </div>
              <span className="text-xs text-slate-500 dark:text-stone-400 text-center">
                {bar.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WordsLearnedBarChart;
