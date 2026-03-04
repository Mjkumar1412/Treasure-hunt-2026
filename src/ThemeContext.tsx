import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeType = 
  | 'classic' 
  | 'modern-dark' 
  | 'forest' 
  | 'pirate' 
  | 'minimal' 
  | 'retro' 
  | 'mystery' 
  | 'festival' 
  | 'tech' 
  | 'kids'
  | 'underwater'
  | 'desert'
  | 'space';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  availableThemes: { id: ThemeType; name: string; icon: string }[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('app-theme');
    return (saved as ThemeType) || 'classic';
  });

  const availableThemes: { id: ThemeType; name: string; icon: string }[] = [
    { id: 'classic', name: 'Classic Treasure', icon: '📜' },
    { id: 'modern-dark', name: 'Modern Dark', icon: '🌙' },
    { id: 'forest', name: 'Forest Adventure', icon: '🌳' },
    { id: 'pirate', name: 'Pirate Theme', icon: '🏴‍☠️' },
    { id: 'minimal', name: 'Minimal Light', icon: '⚪' },
    { id: 'retro', name: 'Retro 8-bit', icon: '👾' },
    { id: 'mystery', name: 'Mystery/Horror', icon: '👻' },
    { id: 'festival', name: 'Festival/Colorful', icon: '🎉' },
    { id: 'tech', name: 'Tech/Cyber', icon: '💻' },
    { id: 'kids', name: 'Kids Theme', icon: '🦁' },
    { id: 'underwater', name: 'Underwater/Ocean', icon: '🌊' },
    { id: 'desert', name: 'Desert/Mummy', icon: '🏜️' },
    { id: 'space', name: 'Space/Galaxy', icon: '✦' },
  ];

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem('app-theme', newTheme);
  };

  useEffect(() => {
    // Apply theme class to body
    const body = document.body;
    availableThemes.forEach(t => body.classList.remove(`theme-${t.id}`));
    body.classList.add(`theme-${theme}`);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
