/**
 * This module contains utilities to handle browser refresh issues
 * and ensure proper session restoration when the page is refreshed.
 */

/**
 * Sets a flag in localStorage to indicate the page was just refreshed
 * This helps us handle the refresh differently than normal navigation
 */
export const markRefresh = () => {
  try {
    localStorage.setItem('app_was_refreshed', 'true');
    // Store the current timestamp to know when the refresh happened
    localStorage.setItem('app_refresh_time', Date.now().toString());
  } catch (e) {
    console.error('Error marking refresh in localStorage:', e);
  }
};

/**
 * Checks if the page was just refreshed and clears the flag
 * @returns boolean indicating if the page was just refreshed
 */
export const wasRefreshed = () => {
  try {
    const wasRefreshed = localStorage.getItem('app_was_refreshed') === 'true';
    if (wasRefreshed) {
      localStorage.removeItem('app_was_refreshed');
    }
    return wasRefreshed;
  } catch (e) {
    console.error('Error checking refresh status in localStorage:', e);
    return false;
  }
};

/**
 * Handles window beforeunload events to mark page refreshes
 * This function should be called once when the app initializes
 */
export const setupRefreshDetection = () => {
  // Set up listener for refresh detection
  window.addEventListener('beforeunload', () => {
    markRefresh();
  });

  // Check for sessionStorage corruption, which can happen on refresh
  try {
    sessionStorage.getItem('test');
  } catch (e) {
    console.warn('Session storage may be corrupted, clearing...');
    try {
      sessionStorage.clear();
    } catch (clearError) {
      console.error('Failed to clear corrupted sessionStorage', clearError);
    }
  }
};

/**
 * Force clear session storage and reload the page if needed
 * This is a last resort function to fix persistent issues
 */
export const forceCleanReload = () => {
  try {
    // Clear any auth-related data that might be causing issues
    localStorage.removeItem('supabase.auth.token');
    sessionStorage.clear();
    
    // Add a flag to indicate this was a forced reload
    localStorage.setItem('app_forced_reload', 'true');
    
    // Force reload the page
    window.location.reload();
  } catch (e) {
    console.error('Error during force clean reload:', e);
  }
};

/**
 * Check if the app needs to be force-refreshed after a certain period
 * This helps deal with stale sessions
 * @param timeThreshold Time in milliseconds before considering a force refresh
 */
export const checkForceRefreshNeeded = (timeThreshold = 60 * 60 * 1000) => {
  try {
    const lastRefreshTime = localStorage.getItem('app_refresh_time');
    if (lastRefreshTime) {
      const timeSinceRefresh = Date.now() - parseInt(lastRefreshTime);
      if (timeSinceRefresh > timeThreshold) {
        console.log('Session may be stale, forcing refresh...');
        forceCleanReload();
        return true;
      }
    }
    return false;
  } catch (e) {
    console.error('Error checking for force refresh:', e);
    return false;
  }
};
