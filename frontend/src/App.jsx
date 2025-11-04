//App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import WorkflowTab from './pages/WorkflowTab';
import HistoryTab from './pages/HistoryTab';
import LogsTab from './pages/LogsTab';
import IntegrationsTab from './pages/IntegrationsTab';
import MarketplaceTab from './pages/MarketplaceTab';
import ProfileTab from './pages/ProfileTab';
import Home from './pages/Home';
import Login from './components/Login';
import Signup from './components/Signup';
import OAuthCallback from "./pages/OAuthCallback";
import ScriptTab from "./pages/ScriptTab";
import HostedWorkflows from './pages/HostedWorkflows';
import SharedWorkflowView from './pages/SharedWorkflowView';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/workflow"
              element={
                <ProtectedRoute>
                  <WorkflowTab />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hosted-workflows"
              element={
                <ProtectedRoute>
                  <HostedWorkflows />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workflow/shared/:id"
              element={
                <ProtectedRoute>
                  <SharedWorkflowView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <HistoryTab />
                </ProtectedRoute>
              }
            />
            <Route
              path="/logs"
              element={
                <ProtectedRoute>
                  <LogsTab />
                </ProtectedRoute>
              }
            />
            <Route
              path="/integrations"
              element={
                <ProtectedRoute>
                  <IntegrationsTab />
                </ProtectedRoute>
              }
            />
            <Route
              path="/marketplace"
              element={
                <ProtectedRoute>
                  <MarketplaceTab />
                </ProtectedRoute>
              }
            />
            <Route
              path="/script"
              element={
                <ProtectedRoute>
                  <ScriptTab />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfileTab />
                </ProtectedRoute>
              }
            />
            <Route path="/integrations/oauth/callback" element={
              <ProtectedRoute>
                <OAuthCallback />
              </ProtectedRoute>} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;