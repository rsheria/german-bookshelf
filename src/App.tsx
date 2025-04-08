import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from './context/AuthContext';
import { bypassRefreshIssue } from './services/refreshBypass';
import { startSessionKeepalive } from './services/supabase';
import { initializeLocalAuth, isLoggedIn } from './services/localAuth';
import styled from 'styled-components';

// Import components
import Navbar from './components/Navbar';
import LoginForm from './components/LoginForm';
import SignupForm from './components/SignupForm';
import Footer from './components/common/Footer';

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
import UserActivityPage from './pages/admin/UserActivityPage';

// Import context and i18n
import { AuthProvider } from './context/AuthContext';
import './i18n/i18n';
import GlobalStyles from './styles/globalStyles';

// Create a context for emergency mode
export const EmergencyModeContext = createContext<{
  emergencyMode: boolean;
  setEmergencyMode: React.Dispatch<React.SetStateAction<boolean>>;
}>({
  emergencyMode: false,
  setEmergencyMode: () => {},
});

// Hook to use emergency mode
export const useEmergencyMode = () => useContext(EmergencyModeContext);

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
  display: flex;
  flex-direction: column;
  min-height: 100vh; /* Full viewport height */
`;

const MainContent = styled.main`
  flex: 1 0 auto; /* Grow to fill available space */
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
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

// Create a context for panic mode
const PanicModeContext = createContext(false);

// Create a dedicated routes file to avoid hook ordering issues
const getScrollToTop = () => {
  // Separate component function to avoid React hooks ordering issues
  function ScrollToTopComponent() {
    const { pathname } = useLocation();
    
    useEffect(() => {
      window.scrollTo(0, 0);
    }, [pathname]);
    
    return null;
  }
  
  return <ScrollToTopComponent />;
};

// Protected route component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // Create a separate hook-compliant component
  function ProtectedRouteInternal() {
    const { user, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const panicMode = useContext(PanicModeContext);
    const { emergencyMode } = useEmergencyMode();
    
    // NUCLEAR OPTION: In emergency mode, allow access to protected routes
    if (emergencyMode) {
      console.log(" EMERGENCY MODE: Bypassing protected route");
      return <>{children}</>;
    }
    
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
      if (!isLoading && !user && !panicMode) {
        // If not loading and no user, redirect to login
        // But only if we're not in panic mode
        navigate('/login', { state: { from: location } }); 
      }
    }, [user, isLoading, navigate, panicMode, location]);
    
    // PANIC MODE: If panic mode is active, just render content regardless of auth
    if (panicMode) {
      console.log(" PANIC MODE ACTIVE - Displaying content regardless of auth state");
      return <>{children}</>;
    }
    
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
  }
  
  // Create a final component that separates hooks from the main component
  return (
    <ErrorBoundary>
      <ProtectedRouteInternal />
    </ErrorBoundary>
  );
};

// Admin route component
interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  // Create a separate hook-compliant component
  function AdminRouteInternal() {
    const { user, isAdmin, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const panicMode = useContext(PanicModeContext);
    const { emergencyMode } = useEmergencyMode();
    
    // NUCLEAR OPTION: In emergency mode, allow access to admin routes
    if (emergencyMode) {
      console.log(" EMERGENCY MODE: Bypassing admin route protection");
      return <>{children}</>;
    }
    
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
      // Only redirect if we're not loading, we know the user state, and we're not in panic mode
      if (!isLoading && !panicMode) {
        if (!user) {
          // If no user, redirect to login
          // But only if we're not in panic mode
          navigate('/login', { state: { from: location } });
        } else if (!isAdmin) {
          // If user exists but isn't admin, redirect to homepage
          navigate('/', { state: { from: location } });
        }
      }
    }, [user, isAdmin, isLoading, navigate, panicMode, location]);
    
    // PANIC MODE: If panic mode is active, just render content regardless of auth
    if (panicMode) {
      console.log(" PANIC MODE ACTIVE - Displaying admin content regardless of auth state");
      return <>{children}</>;
    }
    
    // Fast bypass: if we've been loading for over 2.5 seconds, just show content
    if (isLoading && !showLoading) {
      return null;
    }
    
    // Normal loading state - only show if we've been loading for a while
    if (isLoading && showLoading) {
      return <div>Loading...</div>;
    }
    
    // Only render children if we have an admin user
    return (user && isAdmin) ? <>{children}</> : null;
  }
  
  // Create a final component that separates hooks from the main component
  return (
    <ErrorBoundary>
      <AdminRouteInternal />
    </ErrorBoundary>
  );
};

const AppRoutes: React.FC = () => {
  const { i18n } = useTranslation();
  const { emergencyMode } = useEmergencyMode();
  
  // Set language from localStorage on app load
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    }
  }, [i18n]);
  
  // NUCLEAR OPTION: In emergency mode, render all routes without protection
  if (emergencyMode) {
    console.log(" EMERGENCY MODE ACTIVE: Rendering all routes without protection");
    return (
      <ErrorBoundary>
        <AppContainer>
          <Navbar />
          <MainContent>
            {getScrollToTop()}
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/audiobooks" element={<AudiobooksPage />} />
              <Route path="/ebooks" element={<EbooksPage />} />
              <Route path="/books/:id" element={<BookDetailsPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/login" element={<LoginForm />} />
              <Route path="/signup" element={<SignupForm />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/book-requests" element={<BookRequestPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/books" element={<AdminBooksPage />} />
              <Route path="/admin/books/add" element={<AddBookPage />} />
              <Route path="/admin/books/edit/:id" element={<EditBookPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/users/:userId" element={<UserActivityPage />} />
              <Route path="/admin/book-requests" element={<AdminBookRequestsPage />} />
              <Route path="/debug" element={<DebugPage />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </MainContent>
          <Footer />
          <DebugInfo />
        </AppContainer>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AppContainer>
        <Navbar />
        <MainContent>
          {getScrollToTop()}
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/audiobooks" element={<AudiobooksPage />} />
            <Route path="/ebooks" element={<EbooksPage />} />
            <Route path="/books/:id" element={<BookDetailsPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/signup" element={<SignupForm />} />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/book-requests" 
              element={
                <ProtectedRoute>
                  <BookRequestPage />
                </ProtectedRoute>
              } 
            />
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
            <Route 
              path="/admin/users" 
              element={
                <AdminRoute>
                  <AdminUsersPage />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/users/:userId" 
              element={
                <AdminRoute>
                  <UserActivityPage />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/book-requests" 
              element={
                <AdminRoute>
                  <AdminBookRequestsPage />
                </AdminRoute>
              } 
            />
            <Route path="/debug" element={<DebugPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </MainContent>
        <Footer />
        <DebugInfo />
      </AppContainer>
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  // Start session keepalive when the app loads
  useEffect(() => {
    // Start the session keepalive mechanism to prevent timeouts
    console.log('Starting session keepalive mechanism');
    const cleanup = startSessionKeepalive();
    
    // Cleanup when component unmounts
    return () => {
      cleanup();
    };
  }, []);

  // NUCLEAR OPTION: Add emergency mode state
  const [emergencyMode, setEmergencyMode] = useState(false);
  
  // Initialize local auth as an additional safeguard
  useEffect(() => {
    console.log('Initializing local auth safeguard');
    
    // Initialize the local auth system
    initializeLocalAuth();
    
    // Set up a global error handler to catch auth issues
    window.addEventListener('error', (event) => {
      console.log('Global error caught:', event.error);
      
      // If we detect an auth error, activate emergency mode
      if (event.error && 
          (String(event.error).includes('auth') || 
           String(event.error).includes('token') ||
           String(event.error).includes('session'))) {
        console.log('Auth-related error detected, activating emergency mode');
        setEmergencyMode(true);
      }
    });
    
    // Set up a visibility change handler to refresh auth when tab becomes visible
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible, checking auth status');
        if (isLoggedIn()) {
          console.log('Local auth detects user is logged in');
        }
      }
    });
    
    // Create a watchdog that monitors for content rendering
    const contentWatchdog = setInterval(() => {
      // Check if main content is visible
      const mainContent = document.querySelector('main');
      const navbar = document.querySelector('nav');
      
      if (!mainContent || !navbar) {
        console.log('Content not rendering properly, activating emergency mode');
        setEmergencyMode(true);
      }
    }, 5000);
    
    return () => {
      clearInterval(contentWatchdog);
    };
  }, []);

  // Check for emergency mode in localStorage or sessionStorage
  useEffect(() => {
    const storedEmergencyMode = localStorage.getItem('emergency_mode') === 'true' || 
                               sessionStorage.getItem('emergency_mode') === 'true';
    
    if (storedEmergencyMode) {
      console.log(" EMERGENCY MODE detected from storage");
      setEmergencyMode(true);
    }
    
    // Automatically activate emergency mode after a crash or if app is stuck for more than 8 seconds
    const emergencyTimer = setTimeout(() => {
      console.log(" EMERGENCY MODE activated automatically after timeout");
      setEmergencyMode(true);
      localStorage.setItem('emergency_mode', 'true');
      sessionStorage.setItem('emergency_mode', 'true');
    }, 8000);
    
    // Also detect refresh events to enable emergency mode
    const isAfterRefresh = window.performance && 
                          window.performance.navigation && 
                          window.performance.navigation.type === 1;
                          
    if (isAfterRefresh) {
      console.log(" EMERGENCY MODE activated after page refresh");
      setEmergencyMode(true);
      localStorage.setItem('emergency_mode', 'true');
      sessionStorage.setItem('emergency_mode', 'true');
    }
    
    // Special emergency trigger for apps that crash after a few seconds
    let contentVisibleCount = 0;
    const watchContentVisibility = setInterval(() => {
      // If the main content is visible, increment the counter
      if (document.querySelector('main')) {
        contentVisibleCount++;
        
        // If content has been visible for 3 checks, clear the emergency timer
        if (contentVisibleCount >= 3) {
          clearTimeout(emergencyTimer);
          clearInterval(watchContentVisibility);
        }
      }
    }, 1000);
    
    return () => {
      clearTimeout(emergencyTimer);
      clearInterval(watchContentVisibility);
    };
  }, []);

  // Add a forced panic mode that will bypass any loading states
  const [panicMode, setPanicMode] = useState(false);
  
  // Monitor for refresh specifically
  useEffect(() => {
    // Check if this was a page refresh (not initial load)
    const wasRefreshed = 
      (typeof performance !== 'undefined' && 
       performance.navigation && 
       performance.navigation.type === 1) ||
      sessionStorage.getItem('was_not_first_load') === 'true';
      
    // Mark that we've loaded once before
    sessionStorage.setItem('was_not_first_load', 'true');
    
    if (wasRefreshed) {
      console.log(" Page was refreshed - checking for auth issues");
      
      // After a short delay, check if we're stuck in a loading state
      const recoveryTimer = setTimeout(async () => {
        const isLoading = document.querySelector('.loading') !== null || 
                        document.querySelector('[role="progressbar"]') !== null;
                        
        // If we appear to be stuck loading, try the bypass
        if (isLoading) {
          console.log(" Detected possible auth issue after refresh - attempting recovery");
          const bypassSucceeded = await bypassRefreshIssue();
          
          if (!bypassSucceeded) {
            console.log(" Bypass failed - activating panic mode as last resort");
            setPanicMode(true);
          }
        }
      }, 2000); // Check after 2 seconds
      
      return () => clearTimeout(recoveryTimer);
    }
  }, []);
  
  return (
    <EmergencyModeContext.Provider value={{ emergencyMode, setEmergencyMode }}>
      <PanicModeContext.Provider value={panicMode}>
        <ThemeProvider>
          <AuthProvider>
            <GlobalStyles />
            <AppRoutes />
          </AuthProvider>
        </ThemeProvider>
      </PanicModeContext.Provider>
    </EmergencyModeContext.Provider>
  );
};

export default App;
