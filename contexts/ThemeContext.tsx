
// @ts-nocheck
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type AestheticEra = 'genesis' | 'editorial' | 'ethereal';

export interface Palette {
  name: string;
  base: string;
  text: string;
  subtle: string;
  accent: string;
  border?: string; // Added border spec
  isDark: boolean;
  genre?: string;
  fontFamily?: string;
  headerFont?: string;
  logoStyle?: 'serif' | 'brutalist' | 'minimalist';
  logoItalic?: boolean;
}

export const PALETTES: Record<string, Palette> = {
  // Current Generation Palettes
  "Studio Light": {
    name: "Studio Light",
    genre: "Editorial Worktable",
    base: "#F5F5F0",
    text: "#0A0A0A",
    subtle: "#6B6B6B",
    accent: "#0A0A0A",
    border: "#E3E3DE",
    isDark: false,
    fontFamily: "sans",
    headerFont: '"Cormorant Garamond", serif',
    logoStyle: "serif",
    logoItalic: true,
  },
  "Studio Night": {
    name: "Studio Night",
    genre: "Editorial Worktable",
    base: "#0D0B09",
    text: "#FAF9F6",
    subtle: "#A3A3A3",
    accent: "#FAF9F6",
    border: "#242220",
    isDark: true,
    fontFamily: "sans",
    headerFont: '"Cormorant Garamond", serif',
    logoStyle: "serif",
    logoItalic: true,
  },
  "Bright Mode": { 
    name: 'Bright Mode', genre: 'High Contrast', base: '#FFFFFF', text: '#000000', subtle: '#666666', accent: '#000000', border: '#E5E5E5', isDark: false,
    fontFamily: 'sans', headerFont: '"Cormorant Garamond", serif', logoStyle: 'serif', logoItalic: true
  },
  "Dark Mode": { 
    name: 'Dark Mode', genre: 'High Contrast', base: '#000000', text: '#FFFFFF', subtle: '#A3A3A3', accent: '#FFFFFF', border: '#262626', isDark: true,
    fontFamily: 'sans', headerFont: '"Cormorant Garamond", serif', logoStyle: 'serif', logoItalic: true
  },
  "The Journal": { 
    name: 'The Journal', genre: 'Archival Grid', base: '#F9F7F2', text: '#1A1A1A', subtle: '#555555', accent: '#111111', border: '#C8C6BC', isDark: false,
    fontFamily: 'sans', headerFont: '"Cormorant Garamond", serif', logoStyle: 'serif', logoItalic: true
  },
  "Editorial '94": { 
    name: "Editorial '94", genre: 'Blush & Bordeaux', base: '#FFF5F5', text: '#7F1D1D', subtle: '#B91C1C', accent: '#EF4444', border: '#FECACA', isDark: false,
    fontFamily: 'serif', headerFont: '"Cormorant Garamond", serif', logoStyle: 'serif', logoItalic: true
  },
  "The Atelier": {
    name: 'The Atelier', genre: 'Moss & Plum Debris', base: '#F5F7F1', text: '#300C2E', subtle: '#6E7A62', accent: '#5B2154', border: '#E2E8F0', isDark: false,
    fontFamily: 'serif', headerFont: '"Cormorant Garamond", serif', logoStyle: 'serif', logoItalic: false
  },
  "Cinémathèque": { 
    name: 'Cinémathèque', genre: 'Silver Seed & Scotopic Grain', base: '#050505', text: '#EFE9E1', subtle: '#71717A', accent: '#EFE9E1', border: '#27272A', isDark: true,
    fontFamily: 'serif', headerFont: '"Cormorant Garamond", serif', logoStyle: 'serif', logoItalic: true
  },
  "Concrete Gallery": { 
    name: 'Concrete Gallery', genre: 'Brutalist Mint', base: '#1A1A1A', text: '#99F6E4', subtle: '#71717A', accent: '#2DD4BF', border: '#333333', isDark: true,
    fontFamily: 'mono', headerFont: '"Space Mono", monospace', logoStyle: 'brutalist', logoItalic: false
  },
  "Haute Void": { 
    name: 'Haute Void', genre: 'High-Fashion Silence', base: '#000000', text: '#D4D4D4', subtle: '#525252', accent: '#FFFFFF', border: '#262626', isDark: true,
    fontFamily: 'mono', headerFont: '"Space Mono", monospace', logoStyle: 'brutalist', logoItalic: false
  },
  "Custom Workspace": {
    name: 'Custom Workspace', genre: 'Tailored', base: '#FDFBF7', text: '#1A1A1A', subtle: '#A8A29E', accent: '#111111', border: '#E7E5E4', isDark: false,
    fontFamily: 'sans', headerFont: '"Inter", sans-serif', logoStyle: 'minimalist', logoItalic: false
  },
  
  // Classic / V1 Palettes (Resurrected)
  "Void": { 
    name: 'Void', genre: 'Classic', base: '#000000', text: '#FFFFFF', subtle: '#57534E', accent: '#A8A29E', border: '#262626', isDark: true,
    fontFamily: 'sans', headerFont: '"Cormorant Garamond", serif', logoStyle: 'serif', logoItalic: true
  },
  "Vanilla": { 
    name: 'Vanilla', genre: 'Minimalist Default', base: '#FFFDF9', text: '#111111', subtle: '#8A867A', accent: '#EAA2A6', border: '#E7E5E4', isDark: false,
    fontFamily: 'sans', headerFont: '"Cormorant Garamond", serif', logoStyle: 'serif', logoItalic: true
  },
  "Stone": { 
    name: 'Stone', genre: 'Classic', base: '#FDFBF7', text: '#1C1917', subtle: '#A8A29E', accent: '#44403C', border: '#E7E5E4', isDark: false,
    fontFamily: 'sans', headerFont: '"Cormorant Garamond", serif', logoStyle: 'serif', logoItalic: true
  },
  "Blush": { 
    name: 'Blush', genre: 'Classic', base: '#F2E8E5', text: '#3D1C1C', subtle: '#7A6B67', accent: '#3D1C1C', border: '#E7E5E4', isDark: false,
    fontFamily: 'sans', headerFont: '"Cormorant Garamond", serif', logoStyle: 'serif', logoItalic: true
  },
  "Moss": { 
    name: 'Moss', genre: 'Classic', base: '#1C1D1A', text: '#E2E8CE', subtle: '#4F5B4E', accent: '#78716C', border: '#292524', isDark: true,
    fontFamily: 'sans', headerFont: '"Cormorant Garamond", serif', logoStyle: 'serif', logoItalic: true
  },
  "Blood": { 
    name: 'Blood', genre: 'Classic', base: '#2D0606', text: '#FDFBF7', subtle: '#7F1D1D', accent: '#A8A29E', border: '#450a0a', isDark: true,
    fontFamily: 'sans', headerFont: '"Cormorant Garamond", serif', logoStyle: 'serif', logoItalic: true
  }
};

const ThemeContext = createContext<any>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPalette, setCurrentPalette] = useState<Palette>(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("mimi_studio_theme")) {
      localStorage.setItem("mimi_studio_theme", "light");
    }

    const saved = localStorage.getItem('mimi_manifest_palette');
    const legacySaved = localStorage.getItem('mimi_palette_name');
    
    if (saved) {
      try {
        const p = JSON.parse(saved);
        return { ...PALETTES["Studio Light"], ...p };
      } catch (e) {
        return PALETTES["Studio Light"];
      }
    } else if (legacySaved && PALETTES[legacySaved]) {
      return PALETTES[legacySaved];
    }
    return PALETTES["Studio Light"];
  });

  const [currentEra, setCurrentEra] = useState<AestheticEra>(() => {
    return (localStorage.getItem('mimi_manifest_era') as AestheticEra) || 'ethereal';
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(currentPalette.isDark ? 'dark' : 'light');
  
  // Sovereign 1970s CRT Screen & Scanlines toggle
  const [isCRTEnabled, setIsCRTEnabled] = useState<boolean>(() => {
    return localStorage.getItem('mimi_crt_enabled') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('mimi_crt_enabled', isCRTEnabled ? 'true' : 'false');
  }, [isCRTEnabled]);

  const toggleCRT = useCallback(() => {
    setIsCRTEnabled(prev => !prev);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const p = currentPalette || PALETTES['The Journal'];
    
    // PRIMARY AXIS OVERRIDE LOGIC
    root.style.setProperty('--nous-base', p.base); // Background
    root.style.setProperty('--nous-text', p.text); // Foreground / Typography Contrast
    root.style.setProperty('--nous-subtle', p.subtle); // Debris / Low Signal
    root.style.setProperty('--nous-accent', p.accent); // The Interactive Axis / Primary Accent
    root.style.setProperty('--nous-border', p.border || p.subtle); // New Border Variable
    root.style.setProperty('--nous-font-header', p.headerFont || '"Cormorant Garamond", serif');
    if (p.fontFamily) {
        if (p.fontFamily === 'mono') {
             root.style.setProperty('--era-font-sans', '"JetBrains Mono", monospace');
             root.style.setProperty('--era-font-serif', '"JetBrains Mono", monospace');
        } else if (p.fontFamily === 'serif') {
             root.style.setProperty('--era-font-sans', '"Cormorant Garamond", serif');
             root.style.setProperty('--era-font-serif', '"Cormorant Garamond", serif');
        } else if (p.fontFamily === 'sans') {
             root.style.setProperty('--era-font-sans', '"Geist Variable", sans-serif');
             root.style.setProperty('--era-font-serif', '"Cormorant Garamond", serif');
        } else {
             root.style.setProperty('--era-font-sans', `${p.fontFamily}, sans-serif`);
        }
    }

    document.body.style.backgroundColor = p.base;
    document.body.style.color = p.text;

    if (p.isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
      setTheme('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.add('light');
      document.body.classList.remove('dark');
      setTheme('light');
    }
    
    localStorage.setItem('mimi_manifest_palette', JSON.stringify(p));
    localStorage.setItem('mimi_palette_name', p.name); // Keep legacy key updated
  }, [currentPalette]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('era-genesis', 'era-editorial', 'era-ethereal');
    root.classList.add(`era-${currentEra}`);
    localStorage.setItem('mimi_manifest_era', currentEra);
  }, [currentEra]);

  const applyPalette = useCallback((name: string, customAccent?: string, customText?: string) => {
    let basePalette = PALETTES[name] || PALETTES['The Journal'];
    const finalPalette = { 
      ...basePalette,
      accent: customAccent || basePalette.accent,
      text: customText || basePalette.text
    };
    setCurrentPalette(finalPalette);
  }, []);

  const manifestPalette = useCallback((palette: Palette) => {
    setCurrentPalette(palette);
    localStorage.setItem('mimi_manifest_palette', JSON.stringify(palette));
    localStorage.setItem('mimi_palette_name', palette.name);
  }, []);

  const toggleMode = useCallback(() => {
    setCurrentPalette(prev => {
      const name = prev?.isDark ? "Studio Light" : "Studio Night";
      return PALETTES[name] || PALETTES['The Journal'];
    });
  }, []);

  // Legacy toggleTheme support
  const toggleTheme = useCallback(() => {
    setCurrentPalette(prev => {
      const name = prev?.isDark ? 'Stone' : 'Void';
      return PALETTES[name] || PALETTES['The Journal'];
    });
  }, []);

  const setEra = useCallback((era: AestheticEra) => {
    setCurrentEra(era);
  }, []);

  return (
    <ThemeContext.Provider value={{ 
      theme, // Legacy support
      currentPalette, 
      applyPalette, 
      manifestPalette, 
      toggleMode, 
      toggleTheme, // Legacy support
      currentEra, 
      setEra,
      isCRTEnabled,
      setIsCRTEnabled,
      toggleCRT
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
