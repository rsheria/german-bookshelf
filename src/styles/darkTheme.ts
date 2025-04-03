// High-End Professional Dark Theme for German Bookshelf
import { DefaultTheme } from 'styled-components';
import theme from './theme';

const darkTheme: DefaultTheme = {
  colors: {
    // Core Palette - Dark Mode
    primary: '#3B82F6',            // Bright blue that pops on dark backgrounds
    primaryLight: '#60A5FA',       // Lighter blue for hover states
    primaryDark: '#2563EB',        // Darker blue
    secondary: '#10B981',          // Emerald green that complements the blue
    secondaryLight: '#34D399',     // Lighter green
    secondaryDark: '#059669',      // Darker green 
    accent: '#F472B6',            // Softer pink that works well with dark mode
    
    // Neutrals - Dark Mode
    background: '#111827',         // Deep slate background
    backgroundAlt: '#1F2937',      // Slightly lighter slate for cards and elements
    card: '#1E293B',               // Slate card background
    text: '#F9FAFB',               // Off-white text for readability
    textLight: '#D1D5DB',          // Light gray text for secondary information
    border: '#374151',             // Dark gray border
    
    // Functional Colors
    success: '#10B981',            // Success green
    warning: '#F59E0B',            // Warning amber
    error: '#EF4444',              // Error red
    
    // Gradients
    primaryGradient: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)',
    accentGradient: 'linear-gradient(135deg, #F472B6 0%, #10B981 100%)',
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
    outline: '0 0 0 3px rgba(59, 130, 246, 0.5)', // Primary blue outline for focus
  },
  transitions: theme.transitions,  // Keep transitions consistent
  zIndex: theme.zIndex             // Keep z-index consistent
};

export default darkTheme;
