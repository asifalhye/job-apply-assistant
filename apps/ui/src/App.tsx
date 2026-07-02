import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProfilePage } from './pages/ProfilePage';
import { DocumentsPage } from './pages/DocumentsPage';
import { SnippetsPage } from './pages/SnippetsPage';
import { QuestionsPage } from './pages/QuestionsPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { RunPage } from './pages/RunPage';
import { WorkdayPage } from './pages/WorkdayPage';
import { OnboardingPage } from './pages/OnboardingPage';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const done = localStorage.getItem('jaa_onboarding_complete');
    if (!done && location.pathname !== '/onboarding') {
      navigate('/onboarding');
    }
  }, [navigate, location.pathname]);

  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/run" replace />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/snippets" element={<SnippetsPage />} />
        <Route path="/questions" element={<QuestionsPage />} />
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/workday" element={<WorkdayPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/run" element={<RunPage />} />
      </Route>
    </Routes>
  );
}
