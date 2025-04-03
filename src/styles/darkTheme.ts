// High-End Professional Dark Theme for German Bookshelf
import { DefaultTheme } from 'styled-components';
import theme from './theme';

const darkTheme: DefaultTheme = {
  colors: {
    // Core Palette - Dark Mode
    primary: '#4299E1',            // Bright blue that pops on dark backgrounds
    primaryLight: '#63B3ED',       // Lighter blue for hover states
    primaryDark: '#2B6CB0',        // Darker blue
    secondary: '#38B2AC',          // Teal that complements the blue
    secondaryLight: '#4FD1C5',     // Lighter teal
    secondaryDark: '#2C7A7B',      // Darker teal
    accent: '#D53F8C',            // Darker pink that works well with dark mode
    
    // Neutrals - Dark Mode
    background: '#171923',         // Very dark blue-gray
    backgroundAlt: '#2D3748',      // Dark slate
    card: '#1A202C',               // Dark blue-gray for cards
    text: '#F7FAFC',               // Almost white text for maximum readability
    textLight: '#E2E8F0',          // Very light gray for secondary text
    border: '#4A5568',             // Medium gray border
    
    // Functional Colors
    success: '#48BB78',            // Success green
    warning: '#F6AD55',            // Warning orange
    error: '#FC8181',              // Error red/pink
    
    // Gradients
    primaryGradient: 'linear-gradient(135deg, #63B3ED 0%, #4299E1 100%)',
    accentGradient: 'linear-gradient(135deg, #D53F8C 0%, #38B2AC 100%)',
  },
  typography: theme.typography,    // Keep typography consistent
  spacing: theme.spacing,          // Keep spacing consistent
  borderRadius: theme.borderRadius, // Keep border radius consistent
  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.3)',
    md: '0 5px 10px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 20px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 40px rgba(0, 0, 0, 0.6)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.4)',
    outline: '0 0 0 3px rgba(66, 153, 225, 0.5)', // Primary blue outline for focus
  },
  transitions: theme.transitions,  // Keep transitions consistent
  zIndex: theme.zIndex             // Keep z-index consistent
};

export default darkTheme;
