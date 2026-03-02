import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfileSetup from './pages/ProfileSetup';
import Home from './pages/Home';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import GroupBio from './pages/GroupBio';
import CreateGroup from './pages/CreateGroup';
import RoundDetail from './pages/RoundDetail';
import Settings from './pages/Settings';
import SearchFriends from './pages/SearchFriends';
import Report from './pages/Report';
import Layout from './components/Layout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ProfileRedirect({ children }: { children: React.ReactNode }) {
  const { needsProfile } = useAuth();
  if (needsProfile) return <Navigate to="/profile-setup" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/profile-setup" element={
        <PrivateRoute>
          <ProfileSetup />
        </PrivateRoute>
      } />
      <Route path="/" element={
        <PrivateRoute>
          <ProfileRedirect>
            <Layout><Home /></Layout>
          </ProfileRedirect>
        </PrivateRoute>
      } />
      <Route path="/groups" element={
        <PrivateRoute>
          <ProfileRedirect>
            <Layout><Groups /></Layout>
          </ProfileRedirect>
        </PrivateRoute>
      } />
      <Route path="/groups/new" element={
        <PrivateRoute>
          <ProfileRedirect>
            <Layout><CreateGroup /></Layout>
          </ProfileRedirect>
        </PrivateRoute>
      } />
      <Route path="/groups/:id" element={
        <PrivateRoute>
          <ProfileRedirect>
            <Layout><GroupDetail /></Layout>
          </ProfileRedirect>
        </PrivateRoute>
      } />
      <Route path="/groups/:id/bio" element={
        <PrivateRoute>
          <ProfileRedirect>
            <Layout><GroupBio /></Layout>
          </ProfileRedirect>
        </PrivateRoute>
      } />
      <Route path="/rounds/:roundId" element={
        <PrivateRoute>
          <ProfileRedirect>
            <Layout><RoundDetail /></Layout>
          </ProfileRedirect>
        </PrivateRoute>
      } />
      <Route path="/settings" element={
        <PrivateRoute>
          <ProfileRedirect>
            <Layout><Settings /></Layout>
          </ProfileRedirect>
        </PrivateRoute>
      } />
      <Route path="/report" element={
        <PrivateRoute>
          <ProfileRedirect>
            <Layout><Report /></Layout>
          </ProfileRedirect>
        </PrivateRoute>
      } />
      <Route path="/search" element={
        <PrivateRoute>
          <ProfileRedirect>
            <Layout><SearchFriends /></Layout>
          </ProfileRedirect>
        </PrivateRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
