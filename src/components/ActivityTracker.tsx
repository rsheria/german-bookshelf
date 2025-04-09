import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { getClientIp } from '../services/ipTrackingService';

// This component tracks user activity across the site
const ActivityTracker = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Track page views and update last active time
  useEffect(() => {
    const trackActivity = async () => {
      if (!user?.id) return;
      
      try {
        // Get client IP if possible
        const ipAddress = await getClientIp();
        
        // Call our tracking function
        await supabase.rpc('update_user_last_active', {
          user_id_param: user.id,
          url_param: location.pathname,
          ip_param: ipAddress
        });
        
        console.log(`Activity tracked: ${location.pathname}`);
      } catch (error) {
        console.error('Error tracking activity:', error);
      }
    };

    trackActivity();
  }, [location.pathname, user]);

  // Set up user activity monitoring
  useEffect(() => {
    if (!user?.id) return;

    // Track activity on user interactions
    const trackInteraction = async () => {
      try {
        await supabase.rpc('update_user_last_active', {
          user_id_param: user.id
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
  }, [user]);

  return null; // This component doesn't render anything
};

export default ActivityTracker;
