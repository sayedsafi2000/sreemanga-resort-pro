import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessPath } from '@/config/rbac';

const RoleGuard: React.FC<{ path: string; children: React.ReactNode }> = ({ path, children }) => {
  const { user } = useAuth();
  if (!canAccessPath(user?.role, path)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <>{children}</>;
};

export default RoleGuard;
