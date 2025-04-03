import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { supabase } from '../services/supabase';

// Recovery button that appears when app gets stuck
const RecoveryButton = styled.button`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-weight: bold;
  cursor: pointer;
  z-index: 9999;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  
  &:hover {
    background-color: #c0392b;
  }
`;

// Recovery banner that appears at the top when in recovery mode
const RecoveryBanner = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: #f39c12;
  color: white;
  text-align: center;
  padding: 8px;
  font-weight: bold;
  z-index: 9999;
`;

// Main recovery handler component
const RecoveryHandler: React.FC = () => {
  const [showRecoveryButton, setShowRecoveryButton] = useState(false);
  const [inRecoveryMode, setInRecoveryMode] = useState(false);
  const [recoverySessionId, setRecoverySessionId] = useState<string | null>(null);
  
  // Check if we need to show recovery options
  useEffect(() => {
    // Check if we're in recovery mode
    const recoveryFlag = localStorage.getItem('app_recovery_mode');
    if (recoveryFlag === 'true') {
      setInRecoveryMode(true);
      
      // Store a unique recovery session ID
      const sessionId = localStorage.getItem('recovery_session_id') || 
        `recovery_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      localStorage.setItem('recovery_session_id', sessionId);
      setRecoverySessionId(sessionId);
      
      console.log('App is running in recovery mode, session:', sessionId);
    }
    
    // Always show recovery button after a delay if page might be stuck
    const timer = setTimeout(() => {
      setShowRecoveryButton(true);
    }, 10000); // Show after 10 seconds
    
    return () => clearTimeout(timer);
  }, []);
  
  // Function to activate recovery mode
  const activateRecoveryMode = () => {
    console.log('Activating recovery mode...');
    
    try {
      // Clear any potentially corrupted data
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
      
      // Set recovery mode flag
      localStorage.setItem('app_recovery_mode', 'true');
      
      // Force reload the page 
      window.location.replace('/debug');
    } catch (e) {
      console.error('Error activating recovery mode:', e);
      // Last resort - just reload
      window.location.reload();
    }
  };
  
  // Function to exit recovery mode
  const exitRecoveryMode = () => {
    console.log('Exiting recovery mode...');
    localStorage.removeItem('app_recovery_mode');
    localStorage.removeItem('recovery_session_id');
    window.location.replace('/');
  };
  
  // Check Supabase connection in recovery mode
  useEffect(() => {
    if (inRecoveryMode) {
      const checkSupabase = async () => {
        try {
          if (!supabase) {
            console.error('Failed to initialize Supabase in recovery mode');
            return;
          }
          
          const { data, error } = await supabase.auth.getSession();
          console.log('Recovery mode session check:', 
            data?.session ? 'Session Found' : 'No Session', 
            error ? `Error: ${error.message}` : 'No Errors'
          );
        } catch (e) {
          console.error('Error checking Supabase in recovery mode:', e);
        }
      };
      
      checkSupabase();
    }
  }, [inRecoveryMode]);
  
  return (
    <>
      {/* Emergency recovery button */}
      {showRecoveryButton && !inRecoveryMode && (
        <RecoveryButton onClick={activateRecoveryMode}>
          Page Stuck? Click Here
        </RecoveryButton>
      )}
      
      {/* Recovery mode banner */}
      {inRecoveryMode && (
        <>
          <RecoveryBanner>
            Recovery Mode Active - {recoverySessionId}
            <button 
              onClick={exitRecoveryMode}
              style={{ marginLeft: '10px', background: 'white', color: '#f39c12', border: 'none', borderRadius: '4px', padding: '2px 8px' }}
            >
              Exit Recovery
            </button>
          </RecoveryBanner>
        </>
      )}
    </>
  );
};

export default RecoveryHandler;
