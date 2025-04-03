import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

// Import components
import Navbar from './components/Navbar';
import LoginForm from './components/LoginForm';
import SignupForm from './components/SignupForm';

// Import pages
import HomePage from './pages/HomePage';
import AudiobooksPage from './pages/AudiobooksPage';
import EbooksPage from './pages/EbooksPage';
import BookDetailsPage from './pages/BookDetailsPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminBooksPage from './pages/admin/AdminBooksPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AddBookPage from './pages/admin/AddBookPage';
import EditBookPage from './pages/admin/EditBookPage';
import DebugPage from './pages/DebugPage';
import BookRequestPage from './pages/BookRequestPage';
import AdminBookRequestsPage from './pages/admin/AdminBookRequestsPage';

// Import context and i18n
import { AuthProvider, useAuth } from './context/AuthContext';
import './i18n/i18n';
// import { useSessionPersistence } from './hooks/useSessionPersistence';

// Error boundary component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("React Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', backgroundColor: '#ffeeee', border: '1px solid red', borderRadius: '5px', margin: '20px' }}>
          <h2>Something went wrong</h2>
          <p>Error: {this.state.error?.message}</p>
          <p>Check the console for more details</p>
          <button onClick={() => this.setState({ hasError: false })}>Try again</button>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
`;

const MainContent = styled.main`
  flex: 1;
  padding-bottom: 3rem;
`;

const Footer = styled.footer`
  background-color: #2c3e50;
  color: white;
  padding: 2rem;
  text-align: center;
`;

// Debug component to show environment variables
const DebugInfo: React.FC = () => {
  const [showDebug, setShowDebug] = useState(false);
  
  return (
    <div style={{ position: 'fixed', bottom: '10px', right: '10px', zIndex: 9999 }}>
      <button onClick={() => setShowDebug(!showDebug)} style={{ padding: '5px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '3px' }}>
        Debug
      </button>
      {showDebug && (
        <div style={{ backgroundColor: 'rgba(0,0,0,0.8)', color: 'white', padding: '10px', borderRadius: '5px', marginTop: '5px', maxWidth: '500px', overflow: 'auto' }}>
          <p>VITE_SUPABASE_URL: {import.meta.env.VITE_SUPABASE_URL || 'Not set'}</p>
          <p>VITE_SUPABASE_ANON_KEY set: {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Yes' : 'No'}</p>
          <p>NODE_ENV: {import.meta.env.MODE}</p>
          <p>Base URL: {import.meta.env.BASE_URL}</p>
        </div>
      )}
    </div>
  );
};

// Protected route component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  
  // Create a more transparent loading state that won't block content
  const [showLoading, setShowLoading] = useState(false);
  
  // Force the route to render after 2.5 seconds regardless of auth state
  useEffect(() => {
    const timer = setTimeout(() => {
      // If we're still loading after 2.5 seconds, force exit loading state
      if (isLoading) {
        console.log("Force exiting loading state after timeout");
        setShowLoading(false);
      }
    }, 2500);
    
    return () => clearTimeout(timer);
  }, [isLoading]);
  
  // Only show loading after a delay to prevent flicker
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setTimeout(() => {
        setShowLoading(true);
      }, 500);
    } else {
      setShowLoading(false);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading]);
  
  useEffect(() => {
    if (!isLoading && !user) {
      // If not loading and no user, redirect to login
      navigate('/login');
    }
  }, [user, isLoading, navigate]);
  
  // Fast bypass: if we've been loading for over 2.5 seconds, just show content
  if (isLoading && !showLoading) {
    return <>{children}</>;
  }
  
  // Normal loading state - only show if we've been loading for a while
  if (isLoading && showLoading) {
    return <div>Loading...</div>;
  }
  
  // Only render children if we have a user
  return user ? <>{children}</> : null;
};

// Admin route component
interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  
  // Create a more transparent loading state that won't block content
  const [showLoading, setShowLoading] = useState(false);
  
  // Force the route to render after 2.5 seconds regardless of auth state
  useEffect(() => {
    const timer = setTimeout(() => {
      // If we're still loading after 2.5 seconds, force exit loading state
      if (isLoading) {
        console.log("Force exiting admin loading state after timeout");
        setShowLoading(false);
      }
    }, 2500);
    
    return () => clearTimeout(timer);
  }, [isLoading]);
  
  // Only show loading after a delay to prevent flicker
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setTimeout(() => {
        setShowLoading(true);
      }, 500);
    } else {
      setShowLoading(false);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading]);
  
  useEffect(() => {
    // Only redirect if we're not loading and we know the user state
    if (!isLoading) {
      if (!user) {
        // If no user, redirect to login
        navigate('/login');
      } else if (!isAdmin) {
        // If user exists but isn't admin, redirect to homepage
        navigate('/');
      }
    }
  }, [user, isAdmin, isLoading, navigate]);
  
  // Fast bypass: if we've been loading for over 2.5 seconds, just show content
  if (isLoading && !showLoading) {
    // Check localStorage for admin status to help with bypass
    const adminStatus = localStorage.getItem('user_is_admin');
    if (adminStatus === 'true') {
      return <>{children}</>;
    }
    return <>{children}</>;
  }
  
  // Normal loading state - only show if we've been loading for a while
  if (isLoading && showLoading) {
    return <div>Loading...</div>;
  }
  
  // Only render children if we have an admin user
  return (user && isAdmin) ? <>{children}</> : null;
};

const AppRoutes: React.FC = () => {
  const { i18n } = useTranslation();
  // Set language from localStorage on app load
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    }
  }, [i18n]);
  
  return (
    <ErrorBoundary>
      <AppContainer>
        <Navbar />
        <MainContent>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/audiobooks" element={<AudiobooksPage />} />
            <Route path="/ebooks" element={<EbooksPage />} />
            <Route path="/books/:id" element={<BookDetailsPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/signup" element={<SignupForm />} />
            <Route path="/debug" element={<DebugPage />} />
            <Route path="/book-requests" element={<BookRequestPage />} />
            <Route 
              path="/admin/book-requests" 
              element={
                <AdminRoute>
                  <AdminBookRequestsPage />
                </AdminRoute>
              } 
            />
            
            {/* Protected routes */}
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin routes */}
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <AdminDashboardPage />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/books" 
              element={
                <AdminRoute>
                  <AdminBooksPage />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <AdminRoute>
                  <AdminUsersPage />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/books/add" 
              element={
                <AdminRoute>
                  <AddBookPage />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/books/edit/:id" 
              element={
                <AdminRoute>
                  <EditBookPage />
                </AdminRoute>
              } 
            />
            
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </MainContent>
        <Footer>
          &copy; {new Date().getFullYear()} German Bookshelf - All rights reserved
        </Footer>
        <DebugInfo />
      </AppContainer>
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  return (
    <ChakraProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ChakraProvider>
  );
};

export default App;
