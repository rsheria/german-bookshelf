import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { getClientIp, recordIpLog } from '../services/ipTrackingService';

// This component tracks user activity across the site
const ActivityTracker = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [userIp, setUserIp] = useState<string | null>(null);
  
  // Get and store the user's IP address when component mounts
  useEffect(() => {
    // Only fetch IP once when component mounts
    const fetchIp = async () => {
      try {
        const ip = await getClientIp();
        setUserIp(ip);
        console.log('User IP captured for tracking:', ip);
      } catch (error) {
        console.error('Error getting client IP:', error);
      }
    };
    
    fetchIp();
  }, []);

  // Track page views and update last active time
  useEffect(() => {
    const trackActivity = async () => {
      if (!user?.id) return;
      
      try {
        // Use stored IP address or get it again if needed
        const ipAddress = userIp || await getClientIp();
        
        // Call our tracking function
        await supabase.rpc('update_user_last_active', {
          user_id_param: user.id,
          url_param: location.pathname,
          ip_param: ipAddress
        });
        
        // Also record IP directly to ensure it's logged
        await recordIpLog(user.id, ipAddress);
        
        console.log(`Activity tracked: ${location.pathname}`);
      } catch (error) {
        console.error('Error tracking activity:', error);
      }
    };

    if (user?.id) {
      trackActivity();
    }
  }, [location.pathname, user, userIp]);

  // Set up user activity monitoring
  useEffect(() => {
    if (!user?.id) return;

    // Track activity on user interactions
    const trackInteraction = async () => {
      try {
        // Use stored IP or get a new one
        const ipToUse = userIp || await getClientIp();
        
        await supabase.rpc('update_user_last_active', {
          user_id_param: user.id,
          ip_param: ipToUse
        });
      } catch (error) {
        console.error('Error updating last active time:', error);
      }
    };

    // Debounce the tracking to avoid excessive calls
    let timeout: NodeJS.Timeout;
    const debouncedTrack = () => {
      clearTimeout(timeout);
      timeout = setTimeout(trackInteraction, 5000);
    };

    // Add event listeners for user activity
    const events = ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, debouncedTrack);
    });

    // Clean up
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, debouncedTrack);
      });
      clearTimeout(timeout);
    };
  }, [user, userIp]);

  return null; // This component doesn't render anything
};

export default ActivityTracker;
