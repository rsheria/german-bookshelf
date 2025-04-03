import { createGlobalStyle } from 'styled-components';
import theme from './theme';
import darkTheme from './darkTheme';

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
  
  html {
    font-size: ${theme.typography.fontSize.md};
    line-height: ${theme.typography.lineHeight.normal};
    scroll-behavior: smooth;
    height: 100%;
  }
  
  body {
    font-family: ${theme.typography.fontFamily.body};
    font-weight: ${theme.typography.fontWeight.normal};
    line-height: ${theme.typography.lineHeight.normal};
    background-color: ${theme.colors.background};
    color: ${theme.colors.text};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    transition: background-color 0.4s ease-in-out, color 0.4s ease-in-out, border-color 0.4s ease-in-out;
    scroll-behavior: smooth;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    
    &[data-theme='dark'] {
      background-color: ${darkTheme.colors.background};
      color: ${darkTheme.colors.text};
    }
  }
  
  #root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  main {
    flex: 1 0 auto;
  }
  
  footer {
    flex-shrink: 0;
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-family: ${theme.typography.fontFamily.heading};
    font-weight: ${theme.typography.fontWeight.bold};
    line-height: ${theme.typography.lineHeight.tight};
    margin-bottom: ${theme.spacing.md};
    color: ${theme.colors.primary};
    transition: color 0.4s ease-in-out;
    
    body[data-theme='dark'] & {
      color: ${darkTheme.colors.primary};
    }
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
    transition: color 0.4s ease-in-out;
  }
  
  a {
    color: ${theme.colors.accent};
    text-decoration: none;
    transition: color 0.4s ease-in-out, text-decoration 0.4s ease-in-out;
    
    body[data-theme='dark'] & {
      color: ${darkTheme.colors.accent};
    }
    
    &:hover {
      color: ${theme.colors.secondaryDark};
      text-decoration: underline;
      
      body[data-theme='dark'] & {
        color: ${darkTheme.colors.secondaryDark};
      }
    }
  }
  
  button {
    font-family: inherit;
    cursor: pointer;
    outline: none;
    transition: all 0.4s ease-in-out;
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
    transition: background-color 0.4s ease-in-out;
    
    body[data-theme='dark'] & {
      background: ${darkTheme.colors.backgroundAlt};
    }
  }

  ::-webkit-scrollbar-thumb {
    background-color: ${theme.colors.primaryLight};
    border-radius: ${theme.borderRadius.full};
    border: 2px solid ${theme.colors.backgroundAlt};
    transition: background-color 0.4s ease-in-out, border-color 0.4s ease-in-out;
    
    body[data-theme='dark'] & {
      background-color: ${darkTheme.colors.primaryLight};
      border: 2px solid ${darkTheme.colors.backgroundAlt};
    }
  }

  ::-webkit-scrollbar-thumb:hover {
    background-color: ${theme.colors.primary};
    
    body[data-theme='dark'] & {
      background-color: ${darkTheme.colors.primary};
    }
  }
  
  /* Focus styles for accessibility */
  :focus {
    outline: 3px solid ${theme.colors.accent};
    outline-offset: 2px;
    transition: outline-color 0.4s ease-in-out;
    
    body[data-theme='dark'] & {
      outline: 3px solid ${darkTheme.colors.accent};
    }
  }
  
  /* Container for consistent page width */
  .container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 ${theme.spacing.md};
  }

  /* Fade transitions for theme switching */
  .fade-transition {
    transition: all 0.4s ease-in-out;
  }

  /* Ensure consistent card styling across themes */
  .card {
    background-color: ${theme.colors.card};
    border-radius: ${theme.borderRadius.md};
    box-shadow: ${theme.shadows.md};
    transition: background-color 0.4s ease-in-out, box-shadow 0.4s ease-in-out;
    
    body[data-theme='dark'] & {
      background-color: ${darkTheme.colors.card};
      box-shadow: ${darkTheme.shadows.md};
    }
  }
  
  /* Rating Badge Styling */
  .rating-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.5rem;
    border-radius: ${theme.borderRadius.md};
    font-weight: ${theme.typography.fontWeight.bold};
    color: white;
    font-size: ${theme.typography.fontSize.sm};
    transition: background-color 0.3s ease;
  }

  .rating-high {
    background: ${theme.colors.ratingHigh};
  }

  .rating-medium {
    background: ${theme.colors.ratingMedium};
  }

  .rating-low {
    background: ${theme.colors.ratingLow};
  }
  
  /* Cover Item Styling */
  .cover-item {
    position: relative;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    border-radius: ${theme.borderRadius.md};
    overflow: hidden;
    transition: transform 0.3s ease;
    height: 0;
    padding-bottom: 150%; /* 2:3 aspect ratio for book covers */
    
    &:hover {
      transform: translateY(-5px);
    }
    
    .rating-badge {
      position: absolute;
      top: 10px;
      right: 10px;
    }
  }
  
  /* SVG Icon Styling */
  svg {
    fill: currentColor;
    transition: fill 0.3s ease;
  }
`;

export default GlobalStyle;
