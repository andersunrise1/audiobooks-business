import { Link } from 'react-router-dom';

// Each bar is its own book (a distinct entity the reader wants to tell
// apart at a glance, each already direct-labeled by its title), so a fixed
// categorical color cycle here - rather than one accent hue for all - same
// reasoning as StatCard's per-metric accents.
const BAR_COLORS = [
  'bg-violet-600 dark:bg-violet-400 dark:shadow-[0_0_14px_rgba(167,139,250,0.55)]',
  'bg-amber-500 dark:bg-amber-400 dark:shadow-[0_0_14px_rgba(251,191,36,0.55)]',
  'bg-purple-600 dark:bg-purple-400 dark:shadow-[0_0_14px_rgba(192,132,252,0.55)]',
  'bg-blue-600 dark:bg-blue-400 dark:shadow-[0_0_14px_rgba(96,165,250,0.55)]',
  'bg-pink-500 dark:bg-pink-400 dark:shadow-[0_0_14px_rgba(244,114,182,0.55)]',
];

function AudiobookProgressList({ audiobooks }) {
  if (audiobooks.length === 0) {
    return (
      <p className="text-slate-500 dark:text-stone-400 text-sm">
        Nenhum audiobook em progresso ainda.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {audiobooks.map((book, index) => {
        const percent =
          book.chaptersTotal > 0
            ? Math.round((book.chaptersStarted / book.chaptersTotal) * 100)
            : 0;
        const barColor = BAR_COLORS[index % BAR_COLORS.length];

        return (
          <li key={book.audiobookId}>
            <Link
              to={`/audiobooks/${book.audiobookId}/player`}
              className="flex flex-col gap-1.5 rounded-lg border border-slate-200 dark:border-stone-700 p-3 hover:bg-slate-50 dark:hover:bg-stone-800 touch-manipulation"
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium truncate">{book.title}</span>
                <span className="text-slate-500 dark:text-stone-400 shrink-0">
                  {book.chaptersStarted}/{book.chaptersTotal} capítulos · {percent}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-stone-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default AudiobookProgressList;
