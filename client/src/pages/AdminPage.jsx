import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AdminPanel } from '../components/AdminPanel';

export const AdminPage = () => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Verifying administrative privileges...
      </div>
    );
  }

  // RBAC: Non-admin users are redirected away
  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={{ flex: 1, backgroundColor: 'var(--bg-primary)', overflowY: 'auto' }}>
      <AdminPanel />
    </div>
  );
};
