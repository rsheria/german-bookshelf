// Modern, simplified dark theme for German Bookshelf
import { DefaultTheme } from 'styled-components';
import theme from './theme';

const darkTheme: DefaultTheme = {
  colors: {
    // Core colors - Simplified palette 
    primary: '#3277B0',            // Blue-teal similar to light theme but with better visibility in dark
    primaryLight: '#4A93CE',       // Lighter blue-teal
    primaryDark: '#1A5D96',        // Darker blue-teal
    secondary: '#E1B05A',          // Warm gold/amber for accents
    secondaryLight: '#F3C775',     // Lighter gold
    secondaryDark: '#C69A46',      // Darker gold
    accent: '#D65C74',             // Muted red accent
    
    // Neutral colors - More consistent
    background: '#121212',         // Very dark background
    backgroundAlt: '#1E1E1E',      // Slightly lighter background for cards and sections
    card: '#1A1A1A',               // Card background
    border: '#333333',             // Border color - more visible
    text: '#FFFFFF',               // Pure white text for maximum readability
    textSecondary: '#DDDDDD',      // Light gray for secondary text - increased brightness for better readability
    textMuted: '#AAAAAA',          // Muted text color
    textDisabled: '#777777',       // Disabled text color - brighter for better visibility
    
    // Form elements
    input: '#2A2A2A',              // Darker input background
    inputBorder: '#444444',        // More visible input border
    inputText: '#FFFFFF',          // White text for inputs
    inputPlaceholder: '#999999',   // More visible placeholder text
    
    // Links
    link: '#4A93CE',               // Same as primaryLight
    linkHover: '#F3C775',          // Same as secondaryLight
    
    // Functional colors
    success: '#5CB85C',            // Brighter success color for better visibility
    error: '#E05252',              // Brighter error color
    warning: '#F0AD4E',            // Brighter warning color
    info: '#4A93CE',               // Info color matches primaryLight
    
    // Rating colors
    ratingHigh: '#5CB85C',         // High rating - same as success
    ratingMedium: '#F0AD4E',       // Medium rating - same as warning
    ratingLow: '#7878A0',          // Low rating - muted purple
    
    // Description text
    description: '#DDDDDD',        // Same as textSecondary
    
    // Shadows and overlays
    shadow: 'rgba(0, 0, 0, 0.5)',  // Standard shadow
    overlay: 'rgba(0, 0, 0, 0.7)', // Standard overlay
    
    // Gradients - simpler
    primaryGradient: 'linear-gradient(135deg, #4A93CE 0%, #3277B0 100%)',
    accentGradient: 'linear-gradient(135deg, #F3C775 0%, #E1B05A 100%)',
    
    // Navigation-specific color variables
    navActive: '#F3C775',          // Gold for active navigation items - stands out
    navText: '#FFFFFF',            // White for nav text - most readable
    navHover: '#4A93CE',           // Hover matches primaryLight
    hoverBg: 'rgba(74, 147, 206, 0.2)' // Subtle blue hover background
  },
  typography: theme.typography,    // Keep typography consistent
  spacing: theme.spacing,          // Keep spacing consistent
  borderRadius: theme.borderRadius, // Keep border radius consistent
  shadows: {
    ...theme.shadows,
    sm: '0 1px 3px rgba(0, 0, 0, 0.2)', // Slightly different shadows for dark theme
    md: '0 4px 6px rgba(0, 0, 0, 0.3)', // to help with visual hierarchy
    lg: '0 10px 15px rgba(0, 0, 0, 0.4)',
    xl: '0 15px 25px rgba(0, 0, 0, 0.5)',
  },
  transitions: theme.transitions,  // Keep transitions consistent
  zIndex: theme.zIndex             // Keep z-index consistent
};

export default darkTheme;
