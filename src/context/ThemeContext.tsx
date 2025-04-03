import React, { createContext, useState, useContext, useEffect } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';

import theme from '../styles/theme';
import darkTheme from '../styles/darkTheme';

interface ThemeContextProps {
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextProps>({
  toggleTheme: () => {},
  isDark: false,
});

export const useTheme = () => useContext(ThemeContext);

interface Props {
  children: React.ReactNode;
}

export const ThemeProvider = ({ children }: Props) => {
  // Initialize theme from localStorage, default to light theme
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });

  // Toggle theme and save to localStorage
  const toggleTheme = () => {
    setIsDark(prev => {
      const newThemeValue = !prev;
      localStorage.setItem('theme', newThemeValue ? 'dark' : 'light');
      return newThemeValue;
    });
  };

  // Apply theme to body element for global styling
  useEffect(() => {
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const currentTheme = isDark ? darkTheme : theme;

  return (
    <ThemeContext.Provider value={{ toggleTheme, isDark }}>
      <StyledThemeProvider theme={currentTheme}>
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
};
