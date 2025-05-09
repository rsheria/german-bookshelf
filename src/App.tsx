import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from './context/AuthContext';
import { bypassRefreshIssue } from './services/refreshBypass';
import { startSessionKeepalive } from './services/supabase';
import { initializeLocalAuth, isLoggedIn } from './services/localAuth';
import { trackUserActivity, trackPageView, endUserSession } from './services/trackingService';
import styled from 'styled-components';

// Import components
import Navbar from './components/Navbar';
import LoginForm from './components/LoginForm';
import SignupForm from './components/SignupForm';
import Footer from './components/common/Footer';
import ActivityTracker from './components/ActivityTracker'; // Import the ActivityTracker component

// Import pages
import HomePage from './pages/HomePage';
import AudiobooksPage from './pages/AudiobooksPage';
import EbooksPage from './pages/EbooksPage';
import BookDetailsPage from './pages/BookDetailsPage';
import ProfilePage from './pages/ProfilePage';
import SearchResultsPage from './pages/SearchResultsPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminBooksPage from './pages/admin/AdminBooksPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AddBookPage from './pages/admin/AddBookPage';
import EditBookPage from './pages/admin/EditBookPage';
import BookRequestPage from './pages/BookRequestPage';
import DebugPage from './pages/DebugPage';
import AdminBookRequestsPage from './pages/admin/AdminBookRequestsPage';
import UserActivityPage from './pages/admin/UserActivityPage';
import DiagnosticPage from './pages/DiagnosticPage'; // Import the new diagnostic page
import TestCategoryPage from './pages/TestCategoryPage'; // Import the test category page
import CategoryPage from './pages/CategoryPage'; // Import the CategoryPage
import UpdateBooksUtil from './pages/UpdateBooksUtil'; // Import the UpdateBooksUtil page
import FictionPage from './pages/FictionPage'; // Import Fiction page
import NonFictionPage from './pages/NonFictionPage'; // Import Non-Fiction page
import EbookFictionPage from './pages/EbookFictionPage'; // Import Ebook Fiction page
import EbookNonFictionPage from './pages/EbookNonFictionPage'; // Import Ebook Non-Fiction page
import AudiobookFictionPage from './pages/AudiobookFictionPage'; // Import Audiobook Fiction page
import AudiobookNonFictionPage from './pages/AudiobookNonFictionPage'; // Import Audiobook Non-Fiction page
import BookDebugPage from './pages/BookDebugPage'; // Import Book Debug page
import DebugDatabasePage from './pages/DebugDatabasePage'; // Import Database Debug page
import SqlFixPage from './pages/SqlFixPage'; // Import SQL Fix page
import CategorySetupPage from './pages/admin/CategorySetupPage'; // Import Category Setup page
import CategoryBlacklistFixPage from './pages/CategoryBlacklistFixPage'; // Import Category Blacklist Fix page

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
  padding-bottom: 150px; /* prevent content hidden under footer */
`;



// Create a context for panic mode
const PanicModeContext = createContext(false);


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
  const location = useLocation();
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const { emergencyMode } = useEmergencyMode();
  
  // Track page views whenever route changes
  useEffect(() => {
    if (user) {
      trackPageView(user.id, location.pathname);
    }
  }, [location.pathname, user]);
  
  // Track user activity periodically
  useEffect(() => {
    if (user) {
      // Initial tracking when component mounts
      trackUserActivity(user.id);
      
      // Continue tracking while user is active
      const interval = setInterval(() => {
        trackUserActivity(user.id);
      }, 60000); // Track every minute
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [user]);

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
      <>
        <AppContainer>
          <Navbar />
          <MainContent>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/audiobooks" element={<AudiobooksPage />} />
              <Route path="/ebooks" element={<EbooksPage />} />
              <Route path="/book/:seq/:slug.html" element={<BookDetailsPage />} />
              <Route path="/audiobook/:seq/:slug.html" element={<BookDetailsPage />} />
              <Route path="/search" element={<SearchResultsPage />} />
              <Route path="/search/:field/:value" element={<SearchResultsPage />} />
              <Route path="/category/:category" element={<CategoryPage />} />
              <Route path="/login" element={user ? <Navigate to="/" /> : <LoginForm />} />
              <Route path="/signup" element={user ? <Navigate to="/" /> : <SignupForm />} />
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
              <Route 
                path="/admin/category-setup" 
                element={
                  <AdminRoute>
                    <CategorySetupPage />
                  </AdminRoute>
                } 
              />
              <Route path="/debug" element={<DebugPage />} />
              <Route path="/diagnostic" element={<DiagnosticPage />} />
              <Route path="/test-categories" element={<TestCategoryPage />} />
              <Route path="/update-books-util" element={<UpdateBooksUtil />} />
              <Route path="/fiction" element={<FictionPage />} />
              <Route path="/non-fiction" element={<NonFictionPage />} />
              <Route path="/ebooks/fiction" element={<EbookFictionPage />} />
              <Route path="/ebooks/non-fiction" element={<EbookNonFictionPage />} />
              <Route path="/audiobooks/fiction" element={<AudiobookFictionPage />} />
              <Route path="/audiobooks/non-fiction" element={<AudiobookNonFictionPage />} />
              <Route path="/book-debug" element={<BookDebugPage />} />
              <Route path="/database-debug" element={<DebugDatabasePage />} />
              <Route path="/sql-fix" element={<SqlFixPage />} />
              <Route path="/category-blacklist-fix" element={<CategoryBlacklistFixPage />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </MainContent>
          <Footer />
          
        </AppContainer>
      </>
    );
  }

  return (
    <ErrorBoundary>
      <AppContainer>
        <Navbar />
        <MainContent>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/audiobooks" element={<AudiobooksPage />} />
            <Route path="/ebooks" element={<EbooksPage />} />
            <Route path="/book/:seq/:slug.html" element={<BookDetailsPage />} />
            <Route path="/audiobook/:seq/:slug.html" element={<BookDetailsPage />} />
            <Route path="/search" element={<SearchResultsPage />} />
            <Route path="/search/:field/:value" element={<SearchResultsPage />} />
            <Route path="/category/:category" element={<CategoryPage />} />
            <Route path="/login" element={user ? <Navigate to="/" /> : <LoginForm />} />
            <Route path="/signup" element={user ? <Navigate to="/" /> : <SignupForm />} />
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
            <Route 
              path="/admin/category-setup" 
              element={
                <AdminRoute>
                  <CategorySetupPage />
                </AdminRoute>
              } 
            />
            <Route path="/debug" element={<DebugPage />} />
            <Route path="/diagnostic" element={<DiagnosticPage />} />
            <Route path="/update-books-util" element={<UpdateBooksUtil />} />
            <Route path="/fiction" element={<FictionPage />} />
            <Route path="/non-fiction" element={<NonFictionPage />} />
            <Route path="/ebooks/fiction" element={<EbookFictionPage />} />
            <Route path="/ebooks/non-fiction" element={<EbookNonFictionPage />} />
            <Route path="/audiobooks/fiction" element={<AudiobookFictionPage />} />
            <Route path="/audiobooks/non-fiction" element={<AudiobookNonFictionPage />} />
            <Route path="/book-debug" element={<BookDebugPage />} />
            <Route path="/database-debug" element={<DebugDatabasePage />} />
            <Route path="/sql-fix" element={<SqlFixPage />} />
            <Route path="/category-blacklist-fix" element={<CategoryBlacklistFixPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </MainContent>
        <Footer />
        
      </AppContainer>
    </ErrorBoundary>
  );
};

// Enhanced AuthProvider with tracking built in
const EnhancedAuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const authContext = useAuth();
  const { user, signOut: originalSignOut } = authContext;
  
  // Enhance signOut to track session end
  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      // Store the original signOut function
      const origSignOut = originalSignOut;
      
      // Add our enhanced version that tracks session end
      const enhancedSignOut = async () => {
        try {
          // End tracking session
          await endUserSession(user.id);
          console.log('User session ended for tracking on logout');
        } catch (error) {
          console.error('Error ending tracking session:', error);
        }
        
        // Call original signOut
        return origSignOut();
      };
      
      // Expose the enhanced version globally for debugging
      // @ts-ignore - intentionally extending window
      window.__trackingEnhancedSignOut = enhancedSignOut;
    }
  }, [user, originalSignOut]);
  
  return children;
};

function App() {
  const [emergencyMode, setEmergencyMode] = useState(false);
  const { user } = useAuth();
  
  // Start session keepalive when the app loads
  useEffect(() => {
    // Start the session keepalive mechanism to prevent timeouts
    startSessionKeepalive();
    
    // Return cleanup function
    return () => {
      console.log('Cleaning up session keepalive');
    };
  }, []);

  // Initialize local auth as an additional safeguard
  useEffect(() => {
    console.log('Initializing local auth safeguard');
    
    // Initialize the local auth system
    initializeLocalAuth();
  }, []);

  // Add tracking hooks for auth events
  useEffect(() => {
    // Track user activity on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible, checking auth status');
        
        // Track activity if user is logged in
        if (user) {
          trackUserActivity(user.id);
        }
        
        if (isLoggedIn()) {
          console.log('Local auth detects user is logged in');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // When app unmounts or user changes, end the tracking session
      if (user) {
        endUserSession(user.id).catch(err => 
          console.error('Error ending user session:', err)
        );
      }
    };
  }, [user]);

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
            <EnhancedAuthProvider>
              <GlobalStyles />
              <ActivityTracker /> {/* Add the ActivityTracker component here */}
              <AppRoutes />
            </EnhancedAuthProvider>
          </AuthProvider>
        </ThemeProvider>
      </PanicModeContext.Provider>
    </EmergencyModeContext.Provider>
  );
}

export default App;
