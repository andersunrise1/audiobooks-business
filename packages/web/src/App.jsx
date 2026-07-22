import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './store/AuthContext.jsx';
import Layout from './components/layout/Layout.jsx';
import HomePage from './components/pages/HomePage.jsx';
import DashboardPage from './components/pages/DashboardPage.jsx';
import AudiobookListPage from './components/pages/AudiobookListPage.jsx';
import PlayerPage from './components/pages/PlayerPage.jsx';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/audiobooks" element={<AudiobookListPage />} />
            <Route path="/audiobooks/:id/player" element={<PlayerPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
