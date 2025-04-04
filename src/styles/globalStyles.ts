import { createGlobalStyle } from 'styled-components';
import theme from './theme';
import darkTheme from './darkTheme';

const GlobalStyle = createGlobalStyle`
  /* Import premium fonts */
  @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@300;400;600;700&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  
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
    transition: background-color 0.3s ease-in-out, color 0.3s ease-in-out, border-color 0.3s ease-in-out;
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
    padding-bottom: ${theme.spacing.xl};
  }
  
  footer {
    flex-shrink: 0;
    padding: ${theme.spacing.lg} 0;
    margin-top: auto;
    background-color: ${theme.colors.backgroundAlt};
    border-top: 1px solid ${theme.colors.border};
    transition: background-color 0.3s ease-in-out, border-color 0.3s ease-in-out;
    
    body[data-theme='dark'] & {
      background-color: ${darkTheme.colors.backgroundAlt};
      border-color: ${darkTheme.colors.border};
    }
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-family: ${theme.typography.fontFamily.heading};
    font-weight: ${theme.typography.fontWeight.bold};
    line-height: ${theme.typography.lineHeight.tight};
    margin-bottom: ${theme.spacing.md};
    color: ${theme.colors.primary};
    transition: color 0.3s ease-in-out;
    
    body[data-theme='dark'] & {
      color: ${darkTheme.colors.primary};
    }
  }
  
  h1 {
    font-size: ${theme.typography.fontSize['5xl']};
    letter-spacing: -0.025em;
    margin-bottom: ${theme.spacing.lg};
  }
  
  h2 {
    font-size: ${theme.typography.fontSize['4xl']};
    letter-spacing: -0.025em;
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
    line-height: ${theme.typography.lineHeight.relaxed};
    transition: color 0.3s ease-in-out;
  }
  
  a {
    color: ${theme.colors.primary};
    text-decoration: none;
    transition: color 0.3s ease-in-out, text-decoration 0.3s ease-in-out;
    font-weight: ${theme.typography.fontWeight.medium};
    
    body[data-theme='dark'] & {
      color: ${darkTheme.colors.primary};
    }
    
    &:hover {
      color: ${theme.colors.secondary};
      text-decoration: underline;
      
      body[data-theme='dark'] & {
        color: ${darkTheme.colors.secondary};
      }
    }
  }
  
  button {
    font-family: inherit;
    cursor: pointer;
    border: none;
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    border-radius: ${theme.borderRadius.md};
    font-weight: ${theme.typography.fontWeight.medium};
    background-color: ${theme.colors.primary};
    color: white;
    transition: all 0.3s ease-in-out;
    
    &:hover {
      background-color: ${theme.colors.primaryDark};
    }
    
    &:focus {
      outline: none;
      box-shadow: ${theme.shadows.outline};
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    body[data-theme='dark'] & {
      background-color: ${darkTheme.colors.primary};
      
      &:hover {
        background-color: ${darkTheme.colors.primaryDark};
      }
      
      &:focus {
        box-shadow: ${darkTheme.shadows.outline};
      }
    }
  }
  
  img {
    max-width: 100%;
    height: auto;
    border-radius: ${theme.borderRadius.md};
  }
  
  /* Custom Scrollbar Styling */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: ${theme.colors.backgroundAlt};
    border-radius: ${theme.borderRadius.full};
    transition: background-color 0.3s ease-in-out;
    
    body[data-theme='dark'] & {
      background: ${darkTheme.colors.backgroundAlt};
    }
  }

  ::-webkit-scrollbar-thumb {
    background-color: ${theme.colors.border};
    border-radius: ${theme.borderRadius.full};
    transition: background-color 0.3s ease-in-out;
    
    body[data-theme='dark'] & {
      background-color: ${darkTheme.colors.border};
    }
  }

  ::-webkit-scrollbar-thumb:hover {
    background-color: ${theme.colors.primary};
    
    body[data-theme='dark'] & {
      background-color: ${darkTheme.colors.primary};
    }
  }
  
  /* Focus styles for accessibility */
  :focus-visible {
    outline: none;
    box-shadow: ${theme.shadows.outline};
    transition: box-shadow 0.3s ease-in-out;
    
    body[data-theme='dark'] & {
      box-shadow: ${darkTheme.shadows.outline};
    }
  }
  
  /* Container for consistent page width */
  .container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 ${theme.spacing.md};
    
    @media (max-width: 768px) {
      padding: 0 ${theme.spacing.sm};
    }
  }

  /* Fade transitions for theme switching */
  .fade-transition {
    transition: all 0.3s ease-in-out;
  }

  /* Ensure consistent card styling across themes */
  .card {
    background-color: ${theme.colors.card};
    border-radius: ${theme.borderRadius.lg};
    box-shadow: ${theme.shadows.md};
    transition: background-color 0.3s ease-in-out, box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out;
    overflow: hidden;
    height: 100%;
    border: 1px solid ${theme.colors.border};
    
    &:hover {
      transform: translateY(-4px);
      box-shadow: ${theme.shadows.lg};
      border-color: ${theme.colors.secondary};
    }
    
    body[data-theme='dark'] & {
      background-color: ${darkTheme.colors.card};
      box-shadow: ${darkTheme.shadows.md};
      border-color: ${darkTheme.colors.border};
      
      &:hover {
        box-shadow: ${darkTheme.shadows.lg};
        border-color: ${darkTheme.colors.secondary};
      }
    }
  }
  
  /* Rating badge styling */
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
    box-shadow: ${theme.shadows.sm};
  }

  .rating-high {
    background: ${theme.colors.ratingHigh};
    
    body[data-theme='dark'] & {
      background: ${darkTheme.colors.ratingHigh};
    }
  }

  .rating-medium {
    background: ${theme.colors.ratingMedium};
    
    body[data-theme='dark'] & {
      background: ${darkTheme.colors.ratingMedium};
    }
  }

  .rating-low {
    background: ${theme.colors.ratingLow};
    
    body[data-theme='dark'] & {
      background: ${darkTheme.colors.ratingLow};
    }
  }
  
  /* Input styling */
  input, select, textarea {
    font-family: inherit;
    font-size: ${theme.typography.fontSize.md};
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    border-radius: ${theme.borderRadius.md};
    border: 1px solid ${theme.colors.border};
    background-color: ${theme.colors.card};
    color: ${theme.colors.text};
    transition: all 0.3s ease-in-out;
    width: 100%;
    
    &:focus {
      outline: none;
      border-color: ${theme.colors.secondary};
      box-shadow: ${theme.shadows.outline};
    }
    
    &::placeholder {
      color: ${theme.colors.textLight};
      opacity: 0.7;
    }
    
    body[data-theme='dark'] & {
      background-color: ${darkTheme.colors.card};
      border-color: ${darkTheme.colors.border};
      color: ${darkTheme.colors.text};
      
      &:focus {
        border-color: ${darkTheme.colors.secondary};
        box-shadow: ${darkTheme.shadows.outline};
      }
      
      &::placeholder {
        color: ${darkTheme.colors.textLight};
      }
    }
  }
  
  /* Cover item styling */
  .cover-item {
    position: relative;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    border-radius: ${theme.borderRadius.md};
    overflow: hidden;
    transition: all 0.3s ease;
    height: 0;
    padding-bottom: 150%; /* 2:3 aspect ratio for book covers */
    box-shadow: ${theme.shadows.md};
    border: 2px solid transparent;
    
    &:hover {
      transform: translateY(-5px);
      box-shadow: ${theme.shadows.lg};
      border-color: ${theme.colors.secondary};
    }
    
    .rating-badge {
      position: absolute;
      top: 10px;
      right: 10px;
    }
    
    body[data-theme='dark'] & {
      box-shadow: ${darkTheme.shadows.md};
      
      &:hover {
        box-shadow: ${darkTheme.shadows.lg};
        border-color: ${darkTheme.colors.secondary};
      }
    }
  }
  
  /* SVG Icon Styling */
  svg {
    fill: currentColor;
    transition: fill 0.3s ease;
  }
  
  /* Book-specific styling */
  .book-title {
    font-family: ${theme.typography.fontFamily.heading};
    font-weight: ${theme.typography.fontWeight.semibold};
    color: ${theme.colors.primary};
    transition: color 0.3s ease;
    
    body[data-theme='dark'] & {
      color: ${darkTheme.colors.primary};
    }
  }
  
  .book-author {
    font-style: italic;
    color: ${theme.colors.textLight};
    margin-bottom: ${theme.spacing.sm};
    
    body[data-theme='dark'] & {
      color: ${darkTheme.colors.textLight};
    }
  }
  
  /* Page transition animations */
  .page-transition-enter {
    opacity: 0;
    transform: translateY(10px);
  }
  
  .page-transition-enter-active {
    opacity: 1;
    transform: translateY(0);
    transition: opacity 0.3s, transform 0.3s;
  }
  
  .page-transition-exit {
    opacity: 1;
    transform: translateY(0);
  }
  
  .page-transition-exit-active {
    opacity: 0;
    transform: translateY(-10px);
    transition: opacity 0.3s, transform 0.3s;
  }
`;

export default GlobalStyle;
