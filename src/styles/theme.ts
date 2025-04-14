// Modern, simplified light theme for German Bookshelf
const theme = {
  colors: {
    // Core colors - Streamlined palette
    primary: '#2D5470',         // Deep blue-teal - elegant main color
    primaryLight: '#3F769C',    // Lighter blue-teal for hover states
    primaryDark: '#1E3A50',     // Deeper shade for emphasis
    secondary: '#D8B589',       // Warm gold/beige - complementary accent
    secondaryLight: '#E6CEAE',  // Lighter gold for highlights
    secondaryDark: '#BF9B6F',   // Deeper gold for accents
    accent: '#A86D5A',          // Warm terracotta - contrast accent
    
    // Neutral colors - Clean and consistent
    background: '#FAFAFA',      // Almost-white background
    backgroundAlt: '#F0F0F0',   // Light gray for alternating sections
    card: '#FFFFFF',            // Pure white cards
    border: '#E0E0E0',          // Light gray border
    text: '#333333',            // Dark gray text for good contrast
    textSecondary: '#555555',   // Medium gray for secondary text
    textMuted: '#777777',       // Muted text color
    textDisabled: '#AAAAAA',    // Disabled text color
    
    // Form elements
    input: '#FFFFFF',           // White input background
    inputBorder: '#D0D0D0',     // Medium gray input border
    inputText: '#333333',       // Dark text for inputs (matches text)
    inputPlaceholder: '#999999', // Medium gray placeholder
    
    // Links
    link: '#3F769C',            // Link color (same as primaryLight)
    linkHover: '#2D5470',       // Hover color for links (same as primary)
    
    // Functional colors - consistent with dark theme
    success: '#4A7A6C',         // Success color - muted green
    error: '#B05252',           // Error color - muted red
    warning: '#D9A441',         // Warning color - muted amber
    info: '#3F769C',            // Info color - matches primaryLight
    
    // Rating colors
    ratingHigh: '#4A7A6C',      // High rating (same as success)
    ratingMedium: '#D9A441',    // Medium rating (same as warning)
    ratingLow: '#6F6F79',       // Low rating - neutral slate
    
    // Description text
    description: '#555555',     // Same as textSecondary
    
    // Shadows and overlays - more cohesive with dark theme
    shadow: 'rgba(0, 0, 0, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.5)',
    
    // Gradients
    primaryGradient: 'linear-gradient(135deg, #3F769C 0%, #2D5470 100%)',
    accentGradient: 'linear-gradient(135deg, #E6CEAE 0%, #D8B589 100%)',
    
    // Navigation-specific color variables
    navActive: '#3F769C',       // Active nav item (same as primaryLight)
    navText: '#333333',         // Nav text (dark gray)
    navHover: '#2D5470',        // Hover text color (same as primary)
    hoverBg: 'rgba(45, 84, 112, 0.1)' // Hover background (based on primary)
  },
  typography: {
    fontFamily: {
      heading: "'Libre Baskerville', 'Georgia', serif", // Elegant serif
      body: "'Source Sans Pro', 'Inter', sans-serif"    // Clean sans-serif
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      md: '1rem',       // 16px (base)
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.6,
      relaxed: 1.8,
    }
  },
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '2.5rem', // 40px
    '3xl': '3rem',   // 48px
  },
  borderRadius: {
    sm: '0.125rem',   // 2px
    md: '0.25rem',    // 4px
    lg: '0.375rem',   // 6px
    xl: '0.5rem',     // 8px
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 2px 4px rgba(0, 0, 0, 0.07), 0 1px 2px rgba(0, 0, 0, 0.05)',
    lg: '0 4px 6px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.05)',
    xl: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.07)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
    outline: '0 0 0 2px rgba(45, 84, 112, 0.4)', // Based on primary
    hoverOutline: '0 0 0 1px rgba(45, 84, 112, 0.3)', // Subtle hover outline
  },
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: '300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)'
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
    overlay: 1700,
  }
};

export default theme;
