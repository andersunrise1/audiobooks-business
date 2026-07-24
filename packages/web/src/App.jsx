import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext.jsx';
import Layout from './components/layout/Layout.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import HomePage from './components/pages/HomePage.jsx';

const DashboardPage = lazy(() => import('./components/pages/DashboardPage.jsx'));
const AudiobookListPage = lazy(() => import('./components/pages/AudiobookListPage.jsx'));
const PlayerPage = lazy(() => import('./components/pages/PlayerPage.jsx'));
const LoginPage = lazy(() => import('./components/pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./components/pages/RegisterPage.jsx'));
const FlashcardReviewPage = lazy(() => import('./components/pages/FlashcardReviewPage.jsx'));
const AdminAnalyticsPage = lazy(() => import('./components/pages/AdminAnalyticsPage.jsx'));

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<p className="p-6 text-slate-500">Carregando...</p>}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/audiobooks" element={<AudiobookListPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route
                path="/audiobooks/:id/player"
                element={
                  <ProtectedRoute>
                    <PlayerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/flashcards"
                element={
                  <ProtectedRoute>
                    <FlashcardReviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminAnalyticsPage />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
