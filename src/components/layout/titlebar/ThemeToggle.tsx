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
      <Tooltip content={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"} placement='bottom-right'>
        <button
          onClick={onToggleTheme}
          className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
          data-no-drag
        >
          {isDarkMode ? (
            <Sun size={20} style={{ color: 'var(--fg-secondary)' }} />
          ) : (
            <Moon size={20} style={{ color: 'var(--fg-secondary)' }} />
          )}
        </button>
      </Tooltip>
      <Tooltip content="Menu" placement='bottom-left'>
        <button
          className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
          data-no-drag
        >
          <Menu size={20} style={{ color: 'var(--fg-secondary)' }} />
        </button>
      </Tooltip>
    </div>
  );
};

export default ThemeToggle;
