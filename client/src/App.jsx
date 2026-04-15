import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import PublicSubmitPage from './pages/PublicSubmitPage';
import DashboardPage from './pages/DashboardPage';
import TicketsPage from './pages/TicketsPage';
import TicketDetailPage from './pages/TicketDetailPage';
import CreateTicketPage from './pages/CreateTicketPage';
import UsersPage from './pages/UsersPage';
import ModerationPage from './pages/ModerationPage';
import ProfilePage from './pages/ProfilePage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';

function ProtectedRoute({ children, adminOnly, superOnly }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role === 'USER') return <Navigate to="/tickets" />;
  if (superOnly && user.role !== 'SUPERADMIN') return <Navigate to="/tickets" />;

  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/tickets" /> : <LoginPage />} />
        <Route path="/submit" element={<PublicSubmitPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/tickets" />} />
          <Route path="dashboard" element={<ProtectedRoute adminOnly><DashboardPage /></ProtectedRoute>} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="tickets/new" element={<CreateTicketPage />} />
          <Route path="tickets/:id" element={<TicketDetailPage />} />
          <Route path="knowledge-base" element={<KnowledgeBasePage />} />
          <Route path="moderation" element={<ProtectedRoute adminOnly><ModerationPage /></ProtectedRoute>} />
          <Route path="users" element={<ProtectedRoute superOnly><UsersPage /></ProtectedRoute>} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/tickets" />} />
      </Routes>
    </>
  );
}
