import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LoadingScreen from './components/LoadingScreen';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MarkerDashboard from './pages/MarkerDashboard';
import MarkerCoursePage from './pages/MarkerCoursePage';
import MarkerAnalyticsPage from './pages/MarkerAnalyticsPage';
import MarkerBadgesPage from './pages/MarkerBadgesPage';
import ModerationPage from './pages/ModerationPage';
import StudentDashboard from './pages/StudentDashboard';
import StudentAnalyticsPage from './pages/StudentAnalyticsPage';
import StudentBadgesPage from './pages/StudentBadgesPage';
import CodeReviewPage from './pages/CodeReviewPage';
import StudentFeedbackPage from './pages/StudentFeedbackPage';
import './App.css';

// Helper to check if user has marker-level access
const hasMarkerAccess = (role) => ['marker', 'moderator', 'module_leader'].includes(role);

const ProtectedRoute = ({ children, requireRole, requireMarkerAccess }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Check for marker-level access (marker, moderator, module_leader)
  if (requireMarkerAccess && !hasMarkerAccess(user.role)) {
    return <Navigate to="/student" replace />;
  }
  
  if (requireRole && user.role !== requireRole) {
    return <Navigate to={hasMarkerAccess(user.role) ? '/marker' : '/student'} replace />;
  }
  
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to={hasMarkerAccess(user.role) ? '/marker' : '/student'} replace />;
  }
  
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      
      {/* Marker/Moderator/Leader Routes */}
      <Route path="/marker" element={<ProtectedRoute requireMarkerAccess><MarkerDashboard /></ProtectedRoute>} />
      <Route path="/marker/course/:courseId" element={<ProtectedRoute requireMarkerAccess><MarkerCoursePage /></ProtectedRoute>} />
      <Route path="/marker/review/:submissionId" element={<ProtectedRoute requireMarkerAccess><CodeReviewPage /></ProtectedRoute>} />
      <Route path="/marker/analytics" element={<ProtectedRoute requireMarkerAccess><MarkerAnalyticsPage /></ProtectedRoute>} />
      <Route path="/marker/badges" element={<ProtectedRoute requireMarkerAccess><MarkerBadgesPage /></ProtectedRoute>} />
      <Route path="/marker/moderation" element={<ProtectedRoute requireMarkerAccess><ModerationPage /></ProtectedRoute>} />
      
      {/* Student Routes */}
      <Route path="/student" element={<ProtectedRoute requireRole="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/feedback/:submissionId" element={<ProtectedRoute requireRole="student"><StudentFeedbackPage /></ProtectedRoute>} />
      <Route path="/student/analytics" element={<ProtectedRoute requireRole="student"><StudentAnalyticsPage /></ProtectedRoute>} />
      <Route path="/student/badges" element={<ProtectedRoute requireRole="student"><StudentBadgesPage /></ProtectedRoute>} />
      
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

function App() {
  const [showLoading, setShowLoading] = useState(true);

  // Show loading screen on first visit
  useEffect(() => {
    const hasVisited = sessionStorage.getItem('hasVisited');
    if (hasVisited) {
      setShowLoading(false);
    }
  }, []);

  const handleLoadingComplete = () => {
    sessionStorage.setItem('hasVisited', 'true');
    setShowLoading(false);
  };

  return (
    <ThemeProvider>
      <AuthProvider>
        {showLoading && <LoadingScreen onComplete={handleLoadingComplete} />}
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-center" richColors />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
