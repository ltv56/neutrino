import React from 'react';
import { Sun, Moon, Menu } from 'lucide-react';
import Tooltip from '@/components/common/Tooltip';

interface ThemeToggleProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDarkMode, onToggleTheme }) => {
  return (
    <div className="flex items-center gap-1 h-full">
      <Tooltip content={isDarkMode ? "Light Mode" : "Dark Mode"} placement='top'>
        <button
          onClick={onToggleTheme}
          className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
          data-no-drag
        >
          {isDarkMode ? (
            <Sun size={18} style={{ color: 'var(--fg-secondary)' }} />
          ) : (
            <Moon size={18} style={{ color: 'var(--fg-secondary)' }} />
          )}
        </button>
      </Tooltip>
    </div>
  );
};

export default ThemeToggle;
