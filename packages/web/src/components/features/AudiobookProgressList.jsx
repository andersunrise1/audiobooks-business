import { Link } from 'react-router-dom';

function AudiobookProgressList({ audiobooks }) {
  if (audiobooks.length === 0) {
    return <p className="text-slate-500 text-sm">Nenhum audiobook em progresso ainda.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {audiobooks.map((book) => (
        <li key={book.audiobookId}>
          <Link
            to={`/audiobooks/${book.audiobookId}/player`}
            className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-stone-700 p-3 hover:bg-slate-50 dark:hover:bg-stone-800"
          >
            <span>{book.title}</span>
            <span className="text-sm text-slate-500">
              {book.chaptersStarted}/{book.chaptersTotal} capítulos
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default AudiobookProgressList;
