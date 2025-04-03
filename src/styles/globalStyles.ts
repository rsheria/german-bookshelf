import { createGlobalStyle } from 'styled-components';
import theme from './theme';

const GlobalStyle = createGlobalStyle`
  /* Import premium fonts */
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
  
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  body {
    font-family: ${theme.typography.fontFamily.body};
    font-weight: ${theme.typography.fontWeight.normal};
    line-height: ${theme.typography.lineHeight.normal};
    color: ${theme.colors.text};
    background-color: ${theme.colors.background};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    transition: background-color 0.3s ease, color 0.3s ease;
    scroll-behavior: smooth;
  }
  
  html {
    font-size: ${theme.typography.fontSize.md};
    line-height: ${theme.typography.lineHeight.normal};
    scroll-behavior: smooth;
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-family: ${theme.typography.fontFamily.heading};
    font-weight: ${theme.typography.fontWeight.bold};
    line-height: ${theme.typography.lineHeight.tight};
    margin-bottom: ${theme.spacing.md};
    color: ${theme.colors.primary};
  }
  
  h1 {
    font-size: ${theme.typography.fontSize['5xl']};
    letter-spacing: -1px;
  }
  
  h2 {
    font-size: ${theme.typography.fontSize['4xl']};
  }
  
  h3 {
    font-size: ${theme.typography.fontSize['3xl']};
  }
  
  h4 {
    font-size: ${theme.typography.fontSize['2xl']};
  }
  
  h5 {
    font-size: ${theme.typography.fontSize.xl};
  }
  
  h6 {
    font-size: ${theme.typography.fontSize.lg};
  }
  
  p {
    margin-bottom: ${theme.spacing.md};
  }
  
  a {
    color: ${theme.colors.accent};
    text-decoration: none;
    transition: color ${theme.transitions.fast};
    
    &:hover {
      color: ${theme.colors.secondaryDark};
      text-decoration: underline;
    }
  }
  
  button {
    font-family: inherit;
    cursor: pointer;
    outline: none;
  }
  
  img {
    max-width: 100%;
    height: auto;
  }
  
  /* Custom Scrollbar Styling (for Webkit browsers) */
  ::-webkit-scrollbar {
    width: 10px;
  }

  ::-webkit-scrollbar-track {
    background: ${theme.colors.backgroundAlt};
    border-radius: ${theme.borderRadius.full};
  }

  ::-webkit-scrollbar-thumb {
    background-color: ${theme.colors.primaryLight};
    border-radius: ${theme.borderRadius.full};
    border: 2px solid ${theme.colors.backgroundAlt}; // Creates padding around thumb
  }

  ::-webkit-scrollbar-thumb:hover {
    background-color: ${theme.colors.primary};
  }
  
  /* Focus styles for accessibility */
  :focus {
    outline: 3px solid ${theme.colors.accent};
    outline-offset: 2px;
  }
  
  /* Container for consistent page width */
  .container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 ${theme.spacing.md};
  }
`;

export default GlobalStyle;
