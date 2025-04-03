// Premium Design System for German Bookshelf
const theme = {
  colors: {
    primary: '#1a365d',       // Deep blue
    primaryLight: '#2c5282',  // Lighter blue for hover states
    primaryDark: '#0d2b4c',   // Darker blue for active states
    secondary: '#e67e22',     // Warm orange
    secondaryLight: '#f39c12', // Lighter orange
    secondaryDark: '#d35400', // Darker orange
    accent: '#3498db',        // Highlight blue
    success: '#2ecc71',       // Green for success states
    warning: '#f1c40f',       // Yellow for warning states
    error: '#e74c3c',         // Red for error states
    background: '#f8f9fa',    // Light background
    backgroundAlt: '#e9ecef', // Alternative background
    card: '#ffffff',          // Card background
    text: '#2c3e50',          // Main text color
    textLight: '#7f8c8d',     // Secondary text color
    border: '#dfe6e9',        // Border color
  },
  typography: {
    fontFamily: {
      heading: "'Playfair Display', serif",
      body: "'Open Sans', sans-serif"
    },
    fontSize: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      md: '1rem',        // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
      '5xl': '3rem',     // 48px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.8,
    }
  },
  spacing: {
    xs: '0.25rem',     // 4px
    sm: '0.5rem',      // 8px
    md: '1rem',        // 16px
    lg: '1.5rem',      // 24px
    xl: '2rem',        // 32px
    '2xl': '3rem',     // 48px
    '3xl': '4rem',     // 64px
  },
  borderRadius: {
    sm: '0.125rem',    // 2px
    md: '0.25rem',     // 4px
    lg: '0.5rem',      // 8px
    xl: '1rem',        // 16px
    full: '9999px',    // Fully rounded
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
    md: '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
    lg: '0 10px 15px rgba(0,0,0,0.07), 0 4px 6px rgba(0,0,0,0.05)',
    xl: '0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)',
    inner: 'inset 0 2px 4px 0 rgba(0,0,0,0.06)',
  },
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  zIndex: {
    base: 1,
    dropdown: 10,
    sticky: 100,
    fixed: 200,
    modal: 300,
    tooltip: 400,
  }
};

export default theme;
