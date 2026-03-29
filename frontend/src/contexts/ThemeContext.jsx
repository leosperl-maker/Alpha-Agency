import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(undefined);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Get from localStorage or default to 'dark'
    if (typeof window !== 'undefined') {
      return localStorage.getItem('alpha-theme') || 'light';
    }
    return 'light';
  });

  // Apply theme to DOM
  const applyTheme = useCallback((newTheme) => {
    const root = document.documentElement;
    const body = document.body;
    
    // Remove both theme classes first
    root.classList.remove('dark', 'light');
    body.classList.remove('dark', 'light');
    
    // Add the new theme class
    root.classList.add(newTheme);
    body.classList.add(newTheme);
    
    // Set data attribute for CSS selectors
    root.setAttribute('data-theme', newTheme);
    body.setAttribute('data-theme', newTheme);
    
    // Update CSS custom properties directly for immediate effect
    if (newTheme === 'light') {
      root.style.setProperty('--bg-primary', '#FFFFFF');
      root.style.setProperty('--bg-secondary', '#F8FAFC');
      root.style.setProperty('--bg-card', '#FFFFFF');
      root.style.setProperty('--text-primary', '#1A1A1A');
      root.style.setProperty('--text-secondary', '#4A4A4A');
      root.style.setProperty('--border-color', 'rgba(0, 0, 0, 0.1)');
      body.style.backgroundColor = '#F8FAFC';
      body.style.color = '#1A1A1A';
    } else {
      root.style.setProperty('--bg-primary', '#02040A');
      root.style.setProperty('--bg-secondary', '#0A0A0A');
      root.style.setProperty('--bg-card', 'rgba(255, 255, 255, 0.03)');
      root.style.setProperty('--text-primary', '#FFFFFF');
      root.style.setProperty('--text-secondary', 'rgba(255, 255, 255, 0.6)');
      root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.1)');
      body.style.backgroundColor = '#02040A';
      body.style.color = '#E1E1E1';
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('alpha-theme', theme);
  }, [theme, applyTheme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const newTheme = prev === 'dark' ? 'light' : 'dark';
      return newTheme;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
