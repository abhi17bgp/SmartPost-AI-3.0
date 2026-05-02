import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  console.log('[ProtectedRoute] Checking auth - user:', user ? user.name : 'null', 'loading:', loading);
  
  if (loading) {
    console.log('[ProtectedRoute] Still loading, showing loading screen');
    return <div className="h-screen w-screen flex items-center justify-center bg-background text-primary font-bold">Loading...</div>;
  }
  
  if (!user) {
    console.log('[ProtectedRoute] No user, redirecting to home');
    return <Navigate to="/" />;
  }
  
  console.log('[ProtectedRoute] User authenticated, showing protected content');
  return children;
};

export default ProtectedRoute;
