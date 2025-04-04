// Premium Modern Design System for German Bookshelf
const theme = {
  colors: {
    // Core Palette - Sophisticated & Harmonious
    primary: '#2D5470',         // Deep blue-teal - elegant and authoritative
    primaryLight: '#3F769C',    // Lighter blue-teal for hover states
    primaryDark: '#1E3A50',     // Deeper shade for emphasis
    secondary: '#D8B589',       // Warm gold/beige - complements the primary perfectly
    secondaryLight: '#E6CEAE',  // Lighter gold for highlights
    secondaryDark: '#BF9B6F',   // Deeper gold for accents
    accent: '#8C5D4C',          // Rich terracotta - perfect complement to the blue-gold scheme
    
    // Neutrals - Sophisticated grays with subtle warmth
    background: '#FDFBF9',      // Off-white with slight warmth
    backgroundAlt: '#F5F2EE',   // Very light warm gray for alternating sections
    card: '#FFFFFF',            // Pure white cards
    text: '#2E3440',            // Deep charcoal with slight blue undertone
    textLight: '#4C566A',       // Medium charcoal for secondary text
    border: '#E5E0DB',          // Warm light gray border
    
    // Functional Colors - Muted but clear
    success: '#5E8B7E',         // Muted sage green
    warning: '#C8A27B',         // Muted amber
    error: '#A65953',           // Muted terracotta red
    
    // Rating Badge Colors - Elegant and coordinated
    ratingHigh: '#5E8B7E',      // Sage green (high)
    ratingMedium: '#C8A27B',    // Amber (medium)
    ratingLow: '#8C8C96',       // Blue-gray (low)
    
    // Gradients - Sophisticated
    primaryGradient: 'linear-gradient(135deg, #3F769C 0%, #2D5470 100%)',
    accentGradient: 'linear-gradient(135deg, #D8B589 0%, #8C5D4C 100%)',
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
    sm: '0.125rem',   // 2px - more refined
    md: '0.25rem',    // 4px - subtle
    lg: '0.375rem',   // 6px - elegant
    xl: '0.5rem',     // 8px - refined
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(46, 52, 64, 0.06)',
    md: '0 2px 4px rgba(46, 52, 64, 0.08), 0 1px 2px rgba(46, 52, 64, 0.04)',
    lg: '0 4px 6px rgba(46, 52, 64, 0.08), 0 2px 4px rgba(46, 52, 64, 0.04)',
    xl: '0 10px 15px rgba(46, 52, 64, 0.08), 0 4px 6px rgba(46, 52, 64, 0.04)',
    inner: 'inset 0 2px 4px 0 rgba(46, 52, 64, 0.04)',
    outline: '0 0 0 2px rgba(45, 84, 112, 0.3)', // Subtle outline based on primary
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
  }
};

export default theme;
