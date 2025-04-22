import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getClientIp, recordIpLog } from '../services/ipTrackingService';
import { trackUserActivity, trackPageView } from '../services/trackingService';

// This component tracks user activity across the site
const ActivityTracker = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [userIp, setUserIp] = useState<string | null>(null);
  const hasLoggedRef = useRef(false);

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

  // Log IP once when we have both user and IP
  useEffect(() => {
    if (user?.id && userIp && !hasLoggedRef.current) {
      recordIpLog(user.id, userIp);
      hasLoggedRef.current = true;
    }
  }, [user, userIp]);

  // Track page views and update last active time
  useEffect(() => {
    if (user?.id) trackPageView(user.id, location.pathname);
  }, [location.pathname, user]);

  // Set up user activity monitoring
  useEffect(() => {
    if (!user?.id) return;

    // Track activity on user interactions
    const trackInteraction = async () => {
      trackUserActivity(user.id);
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
