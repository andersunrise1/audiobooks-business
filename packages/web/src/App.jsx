import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext.jsx';
import { ThemeProvider } from './store/ThemeContext.jsx';
import Layout from './components/layout/Layout.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import HomePage from './components/pages/HomePage.jsx';

const DashboardPage = lazy(() => import('./components/pages/DashboardPage.jsx'));
const AudiobookListPage = lazy(() => import('./components/pages/AudiobookListPage.jsx'));
const PlayerPage = lazy(() => import('./components/pages/PlayerPage.jsx'));
const LoginPage = lazy(() => import('./components/pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./components/pages/RegisterPage.jsx'));
const FlashcardReviewPage = lazy(() => import('./components/pages/FlashcardReviewPage.jsx'));
const AdminAnalyticsPage = lazy(() => import('./components/pages/AdminAnalyticsPage.jsx'));
const AdminUploadPage = lazy(() => import('./components/pages/AdminUploadPage.jsx'));
const AdminContentPage = lazy(() => import('./components/pages/AdminContentPage.jsx'));
const AdminMetricsPage = lazy(() => import('./components/pages/AdminMetricsPage.jsx'));
const AdminExperimentsPage = lazy(() => import('./components/pages/AdminExperimentsPage.jsx'));
const AdminUsersPage = lazy(() => import('./components/pages/AdminUsersPage.jsx'));
const AdminRevenuePage = lazy(() => import('./components/pages/AdminRevenuePage.jsx'));
const PricingPage = lazy(() => import('./components/pages/PricingPage.jsx'));
const PaymentSuccessPage = lazy(() => import('./components/pages/PaymentSuccessPage.jsx'));
const PaymentCancelPage = lazy(() => import('./components/pages/PaymentCancelPage.jsx'));
const HelpCenterPage = lazy(() => import('./components/pages/HelpCenterPage.jsx'));
const AdminSupportPage = lazy(() => import('./components/pages/AdminSupportPage.jsx'));

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<p className="p-6 text-slate-500">Carregando...</p>}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/audiobooks" element={<AudiobookListPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/payment/cancel" element={<PaymentCancelPage />} />
                <Route path="/help" element={<HelpCenterPage />} />

                <Route
                  path="/payment/success"
                  element={
                    <ProtectedRoute>
                      <PaymentSuccessPage />
                    </ProtectedRoute>
                  }
                />
                {/* Not wrapped in ProtectedRoute: the backend already lets
                  anonymous visitors play the free-tier audiobooks (Dia 49's
                  optionalAuth); PlayerPage itself handles both the paywall
                  (non-free audiobook) and the logged-out state (no progress
                  tracking/chat/voice commands) - see Dia 59-60. */}
                <Route path="/audiobooks/:id/player" element={<PlayerPage />} />
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
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="upload" replace />} />
                  <Route path="upload" element={<AdminUploadPage />} />
                  <Route path="content" element={<AdminContentPage />} />
                  <Route path="analytics" element={<AdminAnalyticsPage />} />
                  <Route path="metrics" element={<AdminMetricsPage />} />
                  <Route path="experiments" element={<AdminExperimentsPage />} />
                  <Route path="support" element={<AdminSupportPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="revenue" element={<AdminRevenuePage />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
