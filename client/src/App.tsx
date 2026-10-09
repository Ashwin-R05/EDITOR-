import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Layouts
import { ParticipantLayout } from './layouts/ParticipantLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Pages
import { Login } from './pages/Login';

// Participant Pages
import { ParticipantDashboard } from './pages/participant/ParticipantDashboard';
import { ParticipantRound } from './pages/participant/ParticipantRound';
import { ParticipantSubmissions } from './pages/participant/ParticipantSubmissions';
import { ParticipantSubmissionDetail } from './pages/participant/ParticipantSubmissionDetail';
import { ParticipantResults } from './pages/participant/ParticipantResults';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminParticipants } from './pages/admin/AdminParticipants';
import { AdminParticipantDetail } from './pages/admin/AdminParticipantDetail';
import { AdminRounds } from './pages/admin/AdminRounds';
import { AdminProblems } from './pages/admin/AdminProblems';
import { AdminSubmissions } from './pages/admin/AdminSubmissions';
import { AdminSubmissionDetail } from './pages/admin/AdminSubmissionDetail';
import { AdminSecurity } from './pages/admin/AdminSecurity';
import { AdminSecurityDetail } from './pages/admin/AdminSecurityDetail';
import { AdminLeaderboard } from './pages/admin/AdminLeaderboard';
import { AdminAuditLogs } from './pages/admin/AdminAuditLogs';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            {/* Public authentication route */}
            <Route path="/login" element={<Login />} />

            {/* Participant protected routes */}
            <Route
              path="/participant"
              element={
                <ProtectedRoute allowedRole="PARTICIPANT">
                  <ParticipantLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<ParticipantDashboard />} />
              <Route path="round/:id" element={<ParticipantRound />} />
              <Route path="submissions" element={<ParticipantSubmissions />} />
              <Route path="submissions/:id" element={<ParticipantSubmissionDetail />} />
              <Route path="results" element={<ParticipantResults />} />
            </Route>

            {/* Admin protected routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRole="ADMIN">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="participants" element={<AdminParticipants />} />
              <Route path="participants/:id" element={<AdminParticipantDetail />} />
              <Route path="rounds" element={<AdminRounds />} />
              <Route path="problems" element={<AdminProblems />} />
              <Route path="submissions" element={<AdminSubmissions />} />
              <Route path="submissions/:id" element={<AdminSubmissionDetail />} />
              <Route path="security" element={<AdminSecurity />} />
              <Route path="security/:id" element={<AdminSecurityDetail />} />
              <Route path="leaderboard" element={<AdminLeaderboard />} />
              <Route path="scores" element={<Navigate to="/admin/leaderboard" replace />} />
              <Route path="audit-logs" element={<AdminAuditLogs />} />
              <Route path="settings" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>

            {/* Default redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
