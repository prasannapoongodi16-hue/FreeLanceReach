import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/AppShell'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import LeadsPage from './pages/LeadsPage'
import DiscoveryPage from './pages/DiscoveryPage'
import WebsiteAnalysisPage from './pages/WebsiteAnalysisPage'
import EmailDraftsPage from './pages/EmailDraftsPage'
import MessageComposerPage from './pages/MessageComposerPage'
import GmailSettingsPage from './pages/GmailSettingsPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  const { user, loading } = useAuth()
  if (loading) return <div className="app-loading"><span className="loading-mark">F</span><p>Preparing your workspace…</p></div>
  return <Routes>
    <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
    <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/discovery" element={<DiscoveryPage />} />
        <Route path="/website-analysis" element={<WebsiteAnalysisPage />} />
        <Route path="/email-drafts" element={<EmailDraftsPage />} />
        <Route path="/message-composer" element={<MessageComposerPage />} />
        <Route path="/gmail" element={<GmailSettingsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}

export default App
