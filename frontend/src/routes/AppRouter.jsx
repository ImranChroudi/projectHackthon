import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, homePathForRole } from './ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';

// Stagiaire
import { StagiaireDashboard } from '@/features/stagiaire/StagiaireDashboard';
import { ScanPage } from '@/features/stagiaire/ScanPage';
import { StagiaireSchedulePage } from '@/features/stagiaire/SchedulePage';
import { MyAttendancePage } from '@/features/stagiaire/MyAttendancePage';
import { JustificationsPage } from '@/features/stagiaire/JustificationsPage';
import { NotificationsPage } from '@/features/stagiaire/NotificationsPage';

// Formateur
import { FormateurDashboard } from '@/features/formateur/FormateurDashboard';
import { SessionsPage } from '@/features/formateur/SessionsPage';
import { SessionDetailPage } from '@/features/formateur/SessionDetailPage';
import { FormateurSchedulePage } from '@/features/formateur/SchedulePage';

// Admin
import { AdminDashboard } from '@/features/admin/AdminDashboard';
import { UsersPage } from '@/features/admin/UsersPage';
import { ReferencePage } from '@/features/admin/ReferencePage';
import { SchedulePage } from '@/features/admin/SchedulePage';
import { JustificationQueuePage } from '@/features/admin/JustificationQueuePage';
import { PostsPage } from '@/features/admin/PostsPage';
import { AnalyticsPage } from '@/features/admin/AnalyticsPage';

// Partagé
import { AnnoncesPage } from '@/features/shared/AnnoncesPage';

function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? homePathForRole(user.role) : '/login'} replace />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootRedirect />} />

      {/* Espace stagiaire */}
      <Route
        path="/stagiaire"
        element={
          <ProtectedRoute roles={['stagiaire']}>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<StagiaireDashboard />} />
        <Route path="emploi-du-temps" element={<StagiaireSchedulePage />} />
        <Route path="scanner" element={<ScanPage />} />
        <Route path="presences" element={<MyAttendancePage />} />
        <Route path="justifications" element={<JustificationsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="annonces" element={<AnnoncesPage />} />
      </Route>

      {/* Espace formateur */}
      <Route
        path="/formateur"
        element={
          <ProtectedRoute roles={['formateur']}>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<FormateurDashboard />} />
        <Route path="emploi-du-temps" element={<FormateurSchedulePage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="sessions/:id" element={<SessionDetailPage />} />
        <Route path="annonces" element={<AnnoncesPage />} />
      </Route>

      {/* Espace admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="utilisateurs" element={<UsersPage />} />
        <Route path="referentiel" element={<ReferencePage />} />
        <Route path="emploi-du-temps" element={<SchedulePage />} />
        <Route path="justifications" element={<JustificationQueuePage />} />
        <Route path="annonces" element={<PostsPage />} />
        <Route path="analyses" element={<AnalyticsPage />} />
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
