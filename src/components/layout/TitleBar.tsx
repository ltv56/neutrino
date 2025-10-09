import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Search, ChevronLeft, ChevronRight, Menu, PanelLeftClose, PanelLeft, Sun, Moon } from 'lucide-react';

interface TitleBarProps {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

const TitleBar: React.FC<TitleBarProps> = ({ onToggleSidebar, sidebarOpen = true }) => {
  const [isTauri, setIsTauri] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    // Check if running in Tauri
    setIsTauri(typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);

    // Apply theme to document root
    if (newTheme) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  };

  const handleSearchClick = () => {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  const handleMinimize = async () => {
    if (!isTauri) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().minimize();
  };

  const handleMaximize = async () => {
    if (!isTauri) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().toggleMaximize();
  };

  const handleClose = async () => {
    if (!isTauri) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().close();
  };

  return (
    <div
      className="flex items-center justify-between select-none"
      style={{
        height: '40px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Left side - App name + Sidebar toggle */}
      <div className="flex items-center h-full gap-1" data-tauri-drag-region>
        {/* App Title */}
        <div
          className="px-2 font-semibold text-md"
          style={{ color: 'var(--fg-primary)' }}
          data-tauri-drag-region
        >
          Neutrino
        </div>

        {/* Sidebar Toggle Button */}
        <button
          onClick={onToggleSidebar}
          className="h-full px-2 hover:bg-[var(--bg-active)] transition-colors"
          title="Toggle Sidebar"
        >
          {sidebarOpen ? (
            <PanelLeftClose size={20} style={{ color: 'var(--fg-primary)' }} />
          ) : (
            <PanelLeft size={20} style={{ color: 'var(--fg-primary)' }} />
          )}
        </button>
      </div>

      {/* Center - Navigation + Search Bar */}
      <div className="flex items-center justify-center flex-1 h-full px-4 gap-2" data-tauri-drag-region>
        {/* Navigation Icons */}
        <div className="flex items-center gap-1">
          <button
            className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
            title="Back"
          >
            <ChevronLeft size={16} style={{ color: 'var(--fg-secondary)' }} />
          </button>
          <button
            className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
            title="Forward"
          >
            <ChevronRight size={16} style={{ color: 'var(--fg-secondary)' }} />
          </button>
        </div>

        {/* Search Bar - Centered */}
        <div
          className="flex items-center gap-2 px-3 py-1 rounded w-full max-w-md cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
          style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border)',
          }}
          onClick={handleSearchClick}
        >
          <Search size={14} style={{ color: 'var(--fg-secondary)' }} />
          <span className="text-xs flex-1" style={{ color: 'var(--fg-secondary)' }}>
            Search...
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--fg-secondary)',
            }}
          >
            Ctrl+K
          </span>
        </div>
      </div>

      {/* Right side - Theme Toggle & Menu */}
      <div className="flex items-center gap-1 h-full pr-2">
        <button
          onClick={toggleTheme}
          className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? (
            <Sun size={20} style={{ color: 'var(--fg-secondary)' }} />
          ) : (
            <Moon size={20} style={{ color: 'var(--fg-secondary)' }} />
          )}
        </button>
        <button
          className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
          title="Menu"
        >
          <Menu size={20} style={{ color: 'var(--fg-secondary)' }} />
        </button>
      </div>

      {/* Right side - Window controls */}
      <div className="flex items-center h-full">
        <button
          onClick={handleMinimize}
          className="h-full px-4 hover:bg-[var(--bg-active)] transition-colors"
          title="Minimize"
        >
          <Minus size={16} style={{ color: 'var(--fg-primary)' }} />
        </button>
        <button
          onClick={handleMaximize}
          className="h-full px-4 hover:bg-[var(--bg-active)] transition-colors"
          title="Maximize"
        >
          <Square size={14} style={{ color: 'var(--fg-primary)' }} />
        </button>
        <button
          onClick={handleClose}
          className="h-full px-4 hover:bg-red-600 transition-colors"
          title="Close"
        >
          <X size={16} style={{ color: 'var(--fg-primary)' }} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
