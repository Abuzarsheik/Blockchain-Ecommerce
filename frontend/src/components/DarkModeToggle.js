import React, { useState, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import '../styles/theme.css';

const DarkModeToggle = ({ className = '' }) => {
  const [theme, setTheme] = useState('system');
  const [isDark, setIsDark] = useState(false);

  // Check system preference and saved preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'system';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const applyTheme = (newTheme) => {
    const root = document.documentElement;
    const body = document.body;
    
    // Remove existing theme classes
    root.classList.remove('light-theme', 'dark-theme');
    body.classList.remove('light-theme', 'dark-theme');

    let actualTheme = newTheme;
    
    if (newTheme === 'system') {
      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // Apply theme classes
    root.classList.add(`${actualTheme}-theme`);
    body.classList.add(`${actualTheme}-theme`);
    
    // Update custom properties for theme
    if (actualTheme === 'dark') {
      setIsDark(true);
      root.style.setProperty('--bg-primary', '#0f172a');
      root.style.setProperty('--bg-secondary', '#1e293b');
      root.style.setProperty('--text-primary', '#f8fafc');
      root.style.setProperty('--text-secondary', '#cbd5e1');
      root.style.setProperty('--border-color', '#334155');
    } else {
      setIsDark(false);
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f8fafc');
      root.style.setProperty('--text-primary', '#0f172a');
      root.style.setProperty('--text-secondary', '#475569');
      root.style.setProperty('--border-color', '#e2e8f0');
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
    
    // Announce theme change for accessibility
    const announcement = `Theme changed to ${newTheme === 'system' ? 'system preference' : newTheme} mode`;
    const liveRegion = document.getElementById('aria-live-announcements');
    if (liveRegion) {
      liveRegion.textContent = announcement;
    }
  };

  const themes = [
    { id: 'light', icon: <Sun size={16} />, label: 'Light' },
    { id: 'dark', icon: <Moon size={16} />, label: 'Dark' },
    { id: 'system', icon: <Monitor size={16} />, label: 'System' }
  ];

  return (
    <div className={`dark-mode-toggle ${className}`}>
      <div className="theme-selector">
        {themes.map((themeOption) => (
          <button
            key={themeOption.id}
            onClick={() => handleThemeChange(themeOption.id)}
            className={`theme-btn ${theme === themeOption.id ? 'active' : ''}`}
            title={`Switch to ${themeOption.label} theme`}
            aria-label={`Switch to ${themeOption.label} theme`}
          >
            {themeOption.icon}
            <span className="theme-label">{themeOption.label}</span>
          </button>
        ))}
      </div>

      {/* Quick toggle for mobile */}
      <button
        onClick={() => handleThemeChange(isDark ? 'light' : 'dark')}
        className="quick-toggle"
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <style jsx>{`
        .dark-mode-toggle {
          position: relative;
        }

        .theme-selector {
          display: flex;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-lg);
          padding: var(--space-1);
          gap: var(--space-1);
        }

        .theme-btn {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          background: transparent;
          border: none;
          border-radius: var(--border-radius-md);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
          font-size: 0.875rem;
          white-space: nowrap;
        }

        .theme-btn:hover {
          background: var(--primary-100);
          color: var(--primary-600);
        }

        .theme-btn.active {
          background: var(--primary-500);
          color: white;
          box-shadow: var(--shadow-sm);
        }

        .theme-label {
          font-weight: 500;
        }

        .quick-toggle {
          display: none;
          padding: var(--space-2);
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-lg);
          color: var(--text-primary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .quick-toggle:hover {
          background: var(--primary-100);
          color: var(--primary-600);
          border-color: var(--primary-300);
        }

        @media (max-width: 768px) {
          .theme-selector {
            display: none;
          }

          .quick-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default DarkModeToggle; 