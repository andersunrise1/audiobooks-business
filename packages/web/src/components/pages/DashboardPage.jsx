import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../features/StatCard.jsx';
import AudiobookProgressList from '../features/AudiobookProgressList.jsx';
import RecommendationsFeed from '../features/RecommendationsFeed.jsx';
import { apiRequest } from '../../services/api.js';
import { useAuth } from '../../store/AuthContext.jsx';

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
            <StatCard label="Streak" value={`${stats.streakDays} dia(s)`} />
            <StatCard label="Tempo estudado" value={`${stats.totalStudyMinutes} min`} />
            <StatCard
              label="Palavras hoje"
              value={stats.wordsLearned.today}
              hint={`${stats.wordsLearned.week} nesta semana · ${stats.wordsLearned.month} neste mês`}
            />
            <Link to="/flashcards">
              <StatCard label="Flashcards a revisar" value={stats.flashcardsDue} />
            </Link>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Audiobooks em progresso</h2>
            <AudiobookProgressList audiobooks={stats.audiobooksInProgress} />
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardPage;
