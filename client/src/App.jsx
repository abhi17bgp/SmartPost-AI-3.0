import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import { DialogProvider } from './context/DialogContext';
import BackgroundParticles from './components/BackgroundParticles';
import { ThemeProvider } from './context/ThemeContext';

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <DialogProvider>
            <WorkspaceProvider>
              <div className="min-h-screen relative text-foreground font-sans selection:bg-primary/30 selection:text-primary">
                <BackgroundParticles />
                <Toaster position="top-right" toastOptions={{
                  style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', zIndex: 9999 },
                }} />
                <Suspense fallback={
                  <div className="min-h-screen bg-background flex flex-col items-center justify-center">
                    <div className="relative flex items-center justify-center w-16 h-16 mb-4">
                      <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
                      <div className="absolute inset-2 rounded-full border-t-2 border-muted animate-spin" style={{ animationDirection: 'reverse' }}></div>
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                    </div>
                    <p className="text-muted-foreground text-sm font-medium animate-pulse tracking-widest uppercase">Loading...</p>
                  </div>
                }>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/reset-password/:token" element={<ResetPassword />} />
                    <Route path="/verify-email/:token" element={<VerifyEmail />} />
                    <Route
                      path="/dashboard/*"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </Suspense>
              </div>
            </WorkspaceProvider>
          </DialogProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
