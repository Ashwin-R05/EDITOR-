import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: 'ADMIN' | 'PARTICIPANT';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRole }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center">
        <div className="spinner mb-4" />
        <p className="text-cyan-400 font-mono text-sm tracking-wider animate-pulse">
          AUTHENTICATING SYSTEM ACCESS...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    // Redirect to their respective home dashboard if they try to cross roles
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/participant/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
