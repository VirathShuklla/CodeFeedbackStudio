import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MarkerDashboard from './pages/MarkerDashboard';
import StudentDashboard from './pages/StudentDashboard';
import AssignmentsPage from './pages/AssignmentsPage';
import CodeReviewPage from './pages/CodeReviewPage';
import StudentFeedbackPage from './pages/StudentFeedbackPage';
import AnalyticsPage from './pages/AnalyticsPage';
import './App.css';

const ProtectedRoute = ({ children, requireRole }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (requireRole && user.role !== requireRole) {
    return <Navigate to={user.role === 'marker' ? '/marker' : '/student'} replace />;
  }
  
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to={user.role === 'marker' ? '/marker' : '/student'} replace />;
  }
  
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      
      {/* Marker Routes */}
      <Route path="/marker" element={<ProtectedRoute requireRole="marker"><MarkerDashboard /></ProtectedRoute>} />
      <Route path="/marker/assignments" element={<ProtectedRoute requireRole="marker"><AssignmentsPage /></ProtectedRoute>} />
      <Route path="/marker/review/:submissionId" element={<ProtectedRoute requireRole="marker"><CodeReviewPage /></ProtectedRoute>} />
      <Route path="/marker/analytics" element={<ProtectedRoute requireRole="marker"><AnalyticsPage /></ProtectedRoute>} />
      
      {/* Student Routes */}
      <Route path="/student" element={<ProtectedRoute requireRole="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/assignments" element={<ProtectedRoute requireRole="student"><AssignmentsPage /></ProtectedRoute>} />
      <Route path="/student/feedback/:submissionId" element={<ProtectedRoute requireRole="student"><StudentFeedbackPage /></ProtectedRoute>} />
      
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
