// High-End Modern Design System for German Bookshelf
const theme = {
  colors: {
    // Core Palette
    primary: '#1A365D',         // Deep blue (more saturated)
    primaryLight: '#2C5282',    // Medium blue
    primaryDark: '#0F2942',     // Very dark blue
    secondary: '#00B5D8',       // Bright cyan
    secondaryLight: '#4FD1EA',  // Light cyan
    secondaryDark: '#0098B7',   // Dark cyan
    accent: '#ED64A6',          // Vibrant pink
    
    // Neutrals
    background: '#F7FAFC',      // Very light cool grey
    backgroundAlt: '#EDF2F7',   // Light cool grey
    card: '#FFFFFF',            // White cards
    text: '#2D3748',            // Dark slate grey (better contrast)
    textLight: '#4A5568',       // Medium slate grey
    border: '#CBD5E0',          // Cool grey border
    
    // Functional Colors
    success: '#38A169',         // Green
    warning: '#ED8936',         // Orange
    error: '#E53E3E',           // Red
    
    // Rating Badge Colors (from reference styling)
    ratingHigh: '#30b340',      // High ratings (8+)
    ratingMedium: '#84c137',    // Medium ratings (around 7)
    ratingLow: '#8b9e46',       // Lower ratings (6-6.5)
    
    // Gradients
    primaryGradient: 'linear-gradient(135deg, #2C5282 0%, #1A365D 100%)',
    accentGradient: 'linear-gradient(135deg, #ED64A6 0%, #00B5D8 100%)',
  },
  typography: {
    fontFamily: {
      heading: "'Poppins', sans-serif", // Modern sans-serif
      body: "'Poppins', sans-serif"       // Consistent modern sans-serif
    },
    fontSize: {
      xs: '0.8rem',      // 12.8px
      sm: '0.9rem',      // 14.4px
      md: '1rem',        // 16px (base)
      lg: '1.125rem',    // 18px
      xl: '1.3rem',      // 20.8px
      '2xl': '1.6rem',   // 25.6px
      '3xl': '2rem',     // 32px
      '4xl': '2.5rem',   // 40px
      '5xl': '3.2rem',   // 51.2px
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500, // Use medium more often for emphasis
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.6,
      relaxed: 1.9,
    }
  },
  spacing: {
    xs: '0.3rem',    // ~5px
    sm: '0.6rem',    // ~10px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2.2rem',    // ~35px
    '2xl': '3.2rem', // ~51px
    '3xl': '4.5rem', // ~72px
  },
  borderRadius: {
    sm: '4px',
    md: '8px',       // Slightly larger default radius
    lg: '12px', 
    xl: '20px',
    full: '9999px',
  },
  shadows: {
    sm: '0 2px 4px rgba(44, 82, 130, 0.08)',                     // Softer, primary color based tint
    md: '0 5px 10px rgba(44, 82, 130, 0.1)', 
    lg: '0 10px 20px rgba(44, 82, 130, 0.12)',
    xl: '0 20px 40px rgba(44, 82, 130, 0.15)',
    inner: 'inset 0 2px 4px 0 rgba(44, 82, 130, 0.05)',
    outline: '0 0 0 3px rgba(0, 181, 216, 0.5)', // Accent outline for focus
  },
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '300ms cubic-bezier(0.4, 0, 0.2, 1)', // Standard ease-in-out
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: '300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)' // Bouncy effect
  },
  zIndex: {
    base: 1,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  }
};

export default theme;
