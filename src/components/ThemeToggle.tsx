import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-8 bg-gray-200 dark:bg-gray-700 rounded-full p-1 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Toggle Background - now uses gray instead of orange in dark mode */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 opacity-0 dark:opacity-0 transition-opacity duration-300" />
      <div className="absolute inset-0 rounded-full bg-gray-600 dark:bg-gray-600 opacity-0 dark:opacity-100 transition-opacity duration-300" />
      
      {/* Toggle Circle */}
      <div className={`relative w-6 h-6 bg-white dark:bg-gray-800 rounded-full shadow-lg transform transition-all duration-300 ease-in-out flex items-center justify-center ${
        isDark ? 'translate-x-6' : 'translate-x-0'
      }`}>
        {/* Icons */}
        <Sun className={`w-4 h-4 text-orange-500 absolute transition-all duration-300 ${
          isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
        }`} />
        <Moon className={`w-4 h-4 text-gray-600 absolute transition-all duration-300 ${
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
        }`} />
      </div>
    </button>
  );
}