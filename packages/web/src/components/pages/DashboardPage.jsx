import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../features/StatCard.jsx';
import AudiobookProgressList from '../features/AudiobookProgressList.jsx';
import CompletionMeter from '../features/CompletionMeter.jsx';
import WordsLearnedBarChart from '../features/WordsLearnedBarChart.jsx';
import RecommendationsFeed from '../features/RecommendationsFeed.jsx';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

// Aggregate ratio across every in-progress audiobook - the single number
// the CompletionMeter ring shows (a real proportion, not a fabricated one).
function overallCompletionPercent(audiobooksInProgress) {
  const totals = audiobooksInProgress.reduce(
    (acc, book) => ({
      started: acc.started + book.chaptersStarted,
      total: acc.total + book.chaptersTotal,
    }),
    { started: 0, total: 0 },
  );

  return totals.total > 0 ? Math.round((totals.started / totals.total) * 100) : 0;
}

function DashboardPage() {
  const { user, accessToken } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/api/user/stats', { token: accessToken })
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Olá, {user?.name || user?.email}</h1>

      {loading && <p>Carregando...</p>}
      {error && <p className="text-red-600 dark:text-red-400">{error}</p>}

      <RecommendationsFeed />

      {stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Streak" value={`${stats.streakDays} dia(s)`} accent="purple" />
            <StatCard
              label="Tempo estudado"
              value={`${stats.totalStudyMinutes} min`}
              accent="blue"
            />
            <StatCard
              label="Palavras hoje"
              value={stats.wordsLearned.today}
              hint={`${stats.wordsLearned.week} nesta semana · ${stats.wordsLearned.month} neste mês`}
              accent="amber"
            />
            <Link to="/flashcards">
              <StatCard label="Flashcards a revisar" value={stats.flashcardsDue} accent="pink" />
            </Link>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-stone-700 p-4">
            <WordsLearnedBarChart wordsLearned={stats.wordsLearned} />
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-stone-700 p-4 flex flex-col sm:flex-row items-center gap-6">
            <CompletionMeter
              percent={overallCompletionPercent(stats.audiobooksInProgress)}
              label="Progresso geral dos audiobooks em andamento"
            />
            <div className="flex-1 w-full">
              <h2 className="text-lg font-semibold mb-2">Audiobooks em progresso</h2>
              <AudiobookProgressList audiobooks={stats.audiobooksInProgress} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardPage;
