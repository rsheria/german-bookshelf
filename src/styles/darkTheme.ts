// Premium Professional Dark Theme for German Bookshelf
import { DefaultTheme } from 'styled-components';
import theme from './theme';

const darkTheme: DefaultTheme = {
  colors: {
    // Core Palette - Sophisticated Dark Mode
    primary: '#85A8C5',            // Lighter blue-teal that's visible on dark
    primaryLight: '#A7C1D9',       // Very light blue-teal for contrast
    primaryDark: '#3F769C',        // The light theme's primaryLight as dark theme's dark
    secondary: '#E6CEAE',          // Lighter gold that stands out on dark
    secondaryLight: '#F4E5D3',     // Very light warm beige
    secondaryDark: '#D8B589',      // The light theme's secondary as dark's dark
    accent: '#C08976',             // Lighter terracotta for dark mode
    
    // Neutrals - Rich dark colors with warmth
    background: '#292E36',         // Dark blue-gray with slight warmth
    backgroundAlt: '#343B47',      // Slightly lighter blue-gray for sections
    card: '#343B47',               // Card background matching backgroundAlt
    text: '#E9E5E0',               // Warm off-white text
    textLight: '#C4C0BC',          // Light warm gray for secondary text
    border: '#4A5366',             // Medium blue-gray for borders
    
    // Functional Colors - More visible in dark mode
    success: '#8CB5A6',            // Lighter sage green
    warning: '#E6C9A3',            // Lighter amber
    error: '#CE837D',              // Lighter terracotta red
    
    // Rating Badge Colors - Coordinated with light theme but lighter
    ratingHigh: '#8CB5A6',         // Lighter sage green
    ratingMedium: '#E6C9A3',       // Lighter amber
    ratingLow: '#B2B2BC',          // Lighter blue-gray
    
    // Gradients - Sophisticated for dark mode
    primaryGradient: 'linear-gradient(135deg, #A7C1D9 0%, #85A8C5 100%)',
    accentGradient: 'linear-gradient(135deg, #F4E5D3 0%, #C08976 100%)',
  },
  typography: theme.typography,    // Keep typography consistent
  spacing: theme.spacing,          // Keep spacing consistent
  borderRadius: theme.borderRadius, // Keep border radius consistent
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.15)',
    md: '0 2px 4px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0, 0, 0, 0.1)',
    lg: '0 4px 6px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.15)',
    xl: '0 10px 15px rgba(0, 0, 0, 0.3), 0 4px 6px rgba(0, 0, 0, 0.2)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.2)',
    outline: '0 0 0 2px rgba(133, 168, 197, 0.4)', // Based on dark mode primary
  },
  transitions: theme.transitions,  // Keep transitions consistent
  zIndex: theme.zIndex             // Keep z-index consistent
};

export default darkTheme;
