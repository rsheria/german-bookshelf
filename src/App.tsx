import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import { useSessionPersistence } from './hooks/useSessionPersistence';

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
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

// Admin route component
interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAdmin, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!user || !isAdmin) {
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { i18n } = useTranslation();
  const [appLoaded, setAppLoaded] = useState(false);
  const { authStatusChecked } = useAuth();
  
  // Apply session persistence hook to ensure login state survives refreshes
  useSessionPersistence();
  
  // Set language from localStorage on app load
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    }
  }, [i18n]);
  
  // Only set appLoaded once authStatusChecked is true
  useEffect(() => {
    if (authStatusChecked) {
      console.log("Auth status checked, app can now be loaded");
      setAppLoaded(true);
    }
  }, [authStatusChecked]);
  
  // Add a safety timeout to ensure the app loads eventually
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      console.log("Safety timeout triggered - forcing app to load");
      setAppLoaded(true);
    }, 6000); // 6 second safety timeout
    
    return () => clearTimeout(safetyTimer);
  }, []);
  
  if (!appLoaded) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        gap: '1rem'
      }}>
        <div>Initializing German Bookshelf...</div>
        <div>If this takes more than 10 seconds, try the <a href="/debug" style={{color: 'blue', textDecoration: 'underline'}}>Debug Page</a></div>
      </div>
    );
  }

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
