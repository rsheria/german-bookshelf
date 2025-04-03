import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { supabase, getSession } from '../services/supabase';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: monospace;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  margin-bottom: 1rem;
`;

const Section = styled.div`
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: #f5f5f5;
  border-radius: 4px;
`;

const SectionTitle = styled.h2`
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
`;

const InfoItem = styled.div`
  margin-bottom: 0.5rem;
`;

const Button = styled.button`
  background-color: #4CAF50;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 10px;
  margin-bottom: 10px;
  
  &:hover {
    background-color: #45a049;
  }
`;

const ErrorMessage = styled.div`
  color: red;
  padding: 10px;
  background-color: #ffeeee;
  border-radius: 4px;
  margin-bottom: 1rem;
`;

const SuccessMessage = styled.div`
  color: green;
  padding: 10px;
  background-color: #eeffee;
  border-radius: 4px;
  margin-bottom: 1rem;
`;

const DebugPage: React.FC = () => {
  const navigate = useNavigate();
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [testResult, setTestResult] = useState<string>("");
  const [message, setMessage] = useState<{ text: string, isError: boolean } | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  useEffect(() => {
    // Check if we're in recovery mode
    const recoveryMode = localStorage.getItem('app_recovery_mode') === 'true';
    setIsRecoveryMode(recoveryMode);
    
    if (recoveryMode) {
      setMessage({ text: 'Recovery Mode Active - Performing diagnostic checks', isError: false });
    }
    
    // Gather environment variables
    const vars: Record<string, string> = {};
    vars['VITE_SUPABASE_URL'] = import.meta.env.VITE_SUPABASE_URL || 'Not set';
    vars['VITE_SUPABASE_ANON_KEY'] = import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set (Hidden)' : 'Not set';
    vars['BASE_URL'] = import.meta.env.BASE_URL || 'Not set';
    vars['MODE'] = import.meta.env.MODE || 'Not set';
    setEnvVars(vars);

    // Check auth status
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const sessionResult = await getSession();
      setAuthStatus(sessionResult);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setAuthStatus({ error });
    }
  };

  const testSupabaseConnection = async () => {
    setTestResult("Testing connection...");
    try {
      if (!supabase) {
        throw new Error('Supabase client could not be created');
      }
      
      // Try a simple query
      const { data, error } = await supabase.from('books').select('count(*)', { count: 'exact', head: true });
      
      if (error) {
        setTestResult(`Connection test failed: ${error.message}`);
        setMessage({ text: `Connection test failed: ${error.message}`, isError: true });
      } else {
        setTestResult(`Connection successful! Count result: ${JSON.stringify(data)}`);
        setMessage({ text: 'Connection successful!', isError: false });
      }
    } catch (error: any) {
      setTestResult(`Connection test failed: ${error.message}`);
      setMessage({ text: `Connection test failed: ${error.message}`, isError: true });
    }
  };

  const clearLocalStorage = () => {
    localStorage.clear();
    setMessage({ text: 'Local storage cleared', isError: false });
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const signOutAndClearCache = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear browser cache for this site
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      
      setMessage({ text: 'Signed out and cleared cache', isError: false });
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error: any) {
      setMessage({ text: `Error: ${error.message}`, isError: true });
    }
  };

  return (
    <Container>
      <Title>Debug Information</Title>
      
      {message && (
        message.isError ? 
        <ErrorMessage>{message.text}</ErrorMessage> : 
        <SuccessMessage>{message.text}</SuccessMessage>
      )}
      
      {isRecoveryMode && (
        <Section style={{backgroundColor: '#fff3cd', border: '1px solid #ffeeba'}}>
          <SectionTitle>⚠️ Recovery Mode Active</SectionTitle>
          <p>The app is running in recovery mode after detecting issues. Use these tools to fix your session:</p>
          <div style={{marginTop: '1rem'}}>
            <Button onClick={signOutAndClearCache} style={{backgroundColor: '#dc3545'}}>
              Complete Reset & Sign Out
            </Button>
            <Button onClick={() => {
              localStorage.removeItem('app_recovery_mode');
              localStorage.removeItem('recovery_session_id');
              setMessage({text: 'Recovery mode deactivated, reloading...', isError: false});
              setTimeout(() => window.location.href = '/', 1500);
            }}>
              Exit Recovery Mode
            </Button>
          </div>
        </Section>
      )}
      
      <div>
        <Button onClick={() => navigate('/')}>Back to Home</Button>
        <Button onClick={testSupabaseConnection}>Test Supabase Connection</Button>
        <Button onClick={clearLocalStorage}>Clear Local Storage</Button>
        <Button onClick={signOutAndClearCache}>Sign Out & Clear Cache</Button>
      </div>
      
      <Section>
        <SectionTitle>Environment Variables</SectionTitle>
        {Object.entries(envVars).map(([key, value]) => (
          <InfoItem key={key}><strong>{key}:</strong> {value}</InfoItem>
        ))}
      </Section>
      
      <Section>
        <SectionTitle>Authentication Status</SectionTitle>
        <pre>{JSON.stringify(authStatus, null, 2)}</pre>
      </Section>
      
      <Section>
        <SectionTitle>Connection Test Result</SectionTitle>
        <pre>{testResult}</pre>
      </Section>
      
      <Section>
        <SectionTitle>Browser Information</SectionTitle>
        <InfoItem><strong>User Agent:</strong> {navigator.userAgent}</InfoItem>
        <InfoItem><strong>Language:</strong> {navigator.language}</InfoItem>
        <InfoItem><strong>Platform:</strong> {navigator.platform}</InfoItem>
      </Section>
    </Container>
  );
};

export default DebugPage;
