import { DefaultTheme } from 'styled-components';

const darkTheme: DefaultTheme = {
  colors: {
    primary: '#bb86fc',
    primaryDark: '#3700b3',
    secondary: '#03dac6',
    secondaryDark: '#018786',
    background: '#121212',
    text: '#ffffff',
    textLight: '#cccccc',
    error: '#cf6679',
  },
  typography: {
    fontFamily: {
      body: 'Roboto, sans-serif',
      heading: 'Montserrat, sans-serif',
    },
    fontSize: {
      sm: '0.8rem',
      md: '1rem',
      lg: '1.2rem',
      xl: '1.5rem',
      '3xl': '2rem',
      '5xl': '3rem',
    },
    fontWeight: {
      normal: 400,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 15px rgba(0,0,0,0.15)',
  },
  transitions: {
    normal: '0.3s ease',
    fast: '0.2s ease',
  },
};

export default darkTheme;
