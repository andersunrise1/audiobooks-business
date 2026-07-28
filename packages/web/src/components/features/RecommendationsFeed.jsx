import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

function RecommendationsFeed() {
  const { accessToken } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    // Recommendations are a non-critical widget: fail silently rather than
    // showing an error banner on the dashboard if this call breaks.
    apiRequest('/api/user/recommendations', { token: accessToken })
      .then(setData)
      .catch(() => setData(null));
  }, [accessToken]);

  if (!data) return null;

  const { nextChapter, recommendedAudiobook, bestStudyHour } = data;
  if (!nextChapter && !recommendedAudiobook && !bestStudyHour) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Recomendado para você</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {nextChapter && (
          <Link
            to={`/audiobooks/${nextChapter.audiobookId}/player`}
            className="rounded-lg border border-slate-200 dark:border-stone-700 p-4 hover:bg-slate-50 dark:hover:bg-stone-800"
          >
            <p className="text-xs text-slate-500 dark:text-stone-400">Continue de onde parou</p>
            <p className="font-semibold">{nextChapter.audiobookTitle}</p>
            <p className="text-sm text-slate-500 dark:text-stone-400">{nextChapter.chapterTitle}</p>
          </Link>
        )}

        {recommendedAudiobook && (
          <Link
            to={`/audiobooks/${recommendedAudiobook.audiobookId}/player`}
            className="rounded-lg border border-slate-200 dark:border-stone-700 p-4 hover:bg-slate-50 dark:hover:bg-stone-800"
          >
            <p className="text-xs text-slate-500 dark:text-stone-400">Experimente também</p>
            <p className="font-semibold">{recommendedAudiobook.title}</p>
            {(recommendedAudiobook.category || recommendedAudiobook.level) && (
              <p className="text-sm text-slate-500 dark:text-stone-400">
                {[recommendedAudiobook.category, recommendedAudiobook.level]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </Link>
        )}

        {bestStudyHour && (
          <div className="rounded-lg border border-slate-200 dark:border-stone-700 p-4">
            <p className="text-xs text-slate-500 dark:text-stone-400">
              Melhor horário para estudar
            </p>
            <p className="font-semibold">{String(bestStudyHour.hour).padStart(2, '0')}h</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecommendationsFeed;
