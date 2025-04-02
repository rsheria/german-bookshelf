import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

// Import context and i18n
import { AuthProvider, useAuth } from './context/AuthContext';
import './i18n/i18n';

const AppContainer = styled.div`
  min-height: 100vh;
  background-color: #f8f9fa;
`;

const MainContent = styled.main`
  padding-bottom: 3rem;
`;

const Footer = styled.footer`
  background-color: #2c3e50;
  color: white;
  padding: 2rem;
  text-align: center;
`;

// Protected route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
  
  // Set language from localStorage on app load
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    }
  }, [i18n]);
  
  return (
    <Router>
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
      </AppContainer>
    </Router>
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
