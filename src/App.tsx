import React, { useEffect, useState, ReactNode } from 'react';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useTranslation } from 'react-i18next';
import './i18n/i18n'; // Fixed path to i18n

// Import from existing files
// Note: If these paths don't match your file structure, adjust as needed
import LoginPage from './components/LoginForm';
import RegisterPage from './components/SignupForm';
import ProfilePage from './pages/ProfilePage';
import HomePage from './pages/HomePage';
import BookDetailsPage from './pages/BookDetailsPage';
import BooksPage from './pages/AudiobooksPage'; // Using existing page as fallback
import NotFoundPage from './pages/NotFoundPage'; // Create or adjust if needed
import AdminPage from './pages/admin/AdminDashboardPage'; // Using existing admin page
import DebugPage from './pages/DebugPage';
import RecoveryHandler from './components/RecoveryHandler'; // Fixed import

// App container and error boundary components
const AppContainer: React.FC<{children: ReactNode}> = ({ children }) => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
    {children}
  </div>
);

// Simple error boundary component
class ErrorBoundary extends React.Component<{children: ReactNode}, {hasError: boolean}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("App error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Try refreshing the page.</div>;
    }
    return this.props.children;
  }
}

// Theme
const theme = extendTheme({
  colors: {
    brand: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
  },
  fonts: {
    heading: '"Nunito", sans-serif',
    body: '"Nunito", sans-serif',
  },
});

// Protected route component with proper typing
interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string | null;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole = null }) => {
  const { user, isAdmin, authStatusChecked } = useAuth();
  
  // Normal auth checks
  if (!authStatusChecked) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  const { i18n } = useTranslation();
  const [appLoaded, setAppLoaded] = useState(false);
  const { authStatusChecked } = useAuth();
  
  // Set language from localStorage on app load
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    }
  }, [i18n]);
  
  // Wait for auth to be checked before showing app
  useEffect(() => {
    if (authStatusChecked) {
      console.log('Auth status checked, app can now be loaded');
      setAppLoaded(true);
    }
  }, [authStatusChecked]);
  
  // Add a safety timeout to ensure the app loads eventually
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      console.log("Safety timeout triggered - forcing app to load");
      setAppLoaded(true);
    }, 5000); // Increased to 5 second safety timeout for more time
    
    return () => clearTimeout(safetyTimer);
  }, []);
  
  if (!appLoaded) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div>Loading German Bookshelf...</div>
        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
          <a href="/debug" style={{ textDecoration: 'underline' }}>Debug Page</a>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AppContainer>
        <RecoveryHandler />
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/debug" element={<DebugPage />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/books" element={
              <ProtectedRoute>
                <BooksPage />
              </ProtectedRoute>
            } />
            <Route path="/book/:id" element={
              <ProtectedRoute>
                <BookDetailsPage />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <AdminPage />
              </ProtectedRoute>
            } />
            
            {/* Fallback route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </AppContainer>
    </ErrorBoundary>
  );
};

// Wrap the app with providers
const AppWithProviders: React.FC = () => {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ChakraProvider>
  );
};

export default AppWithProviders;
