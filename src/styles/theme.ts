// High-End Modern Design System for German Bookshelf
const theme = {
  colors: {
    // Core Palette
    primary: '#0D1B2A',         // Very dark desaturated blue
    primaryLight: '#1E3A5F',      // Lighter shade for interactions
    primaryDark: '#07111C',       // Darker shade
    secondary: '#00F5D4',       // Vibrant Cyan/Teal
    secondaryLight: '#6AFFEA',    // Lighter cyan
    secondaryDark: '#00C3A9',     // Darker cyan
    accent: '#FF007F',          // Bright Magenta/Pink
    
    // Neutrals
    background: '#F7F9FB',      // Very light grey, almost white
    backgroundAlt: '#EDEFF2',     // Slightly darker grey
    card: '#FFFFFF',            // White cards
    text: '#1B1B1E',            // Dark grey, almost black
    textLight: '#6A7178',       // Medium grey
    border: '#DDE2E7',          // Light grey border

    // Functional Colors
    success: '#28A745',         // Standard green
    warning: '#FFC107',         // Standard yellow
    error: '#DC3545',           // Standard red

    // Gradients
    primaryGradient: 'linear-gradient(135deg, #1E3A5F 0%, #0D1B2A 100%)',
    accentGradient: 'linear-gradient(135deg, #FF007F 0%, #00F5D4 100%)',
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
    sm: '0 2px 4px rgba(13, 27, 42, 0.08)',                     // Softer, primary color based tint
    md: '0 5px 10px rgba(13, 27, 42, 0.1)', 
    lg: '0 10px 20px rgba(13, 27, 42, 0.12)',
    xl: '0 20px 40px rgba(13, 27, 42, 0.15)',
    inner: 'inset 0 2px 4px 0 rgba(13, 27, 42, 0.05)',
    outline: '0 0 0 3px rgba(0, 245, 212, 0.5)', // Accent outline for focus
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
