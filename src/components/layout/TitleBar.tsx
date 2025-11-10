import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PanelLeft, PanelLeftClose } from 'lucide-react';
import { useTitleBarDrag } from '@/hooks';
import { SEARCH_CONTEXTS, DEFAULT_SEARCH_CONTEXT } from '@/constants/routes';
import WindowControls from './titlebar/WindowControls';
import SearchBar from './titlebar/SearchBar';
import NavigationButtons from './titlebar/NavigationButtons';
import ThemeToggle from './titlebar/ThemeToggle';
import Divider from '@/components/common/Divider';
import Tooltip from '@/components/common/Tooltip';

interface TitleBarProps {
  sidebarMode?: 'floating' | 'pinned';
  onToggleSidebarPin?: () => void;
}

const TitleBar: React.FC<TitleBarProps> = ({
  sidebarMode,
  onToggleSidebarPin,
}) => {
  const location = useLocation();
  const [isTauri, setIsTauri] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);



  // Get search context based on current route
  const searchContext = SEARCH_CONTEXTS[location.pathname] || DEFAULT_SEARCH_CONTEXT;

  // Setup titlebar drag functionality
  useTitleBarDrag();

  useEffect(() => {
    // Check if running in Tauri
    setIsTauri(typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window);

    // Listen for window resize events to track maximize state
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      (async () => {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const appWindow = getCurrentWindow();

        // Check initial state
        setIsMaximized(await appWindow.isMaximized());
        const unlisten = await appWindow.onResized(async () => {
          setIsMaximized(await appWindow.isMaximized());
        });

        return () => {
          unlisten();
        };
      })();
    }
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
      id="titlebar"
      className="flex items-center justify-between select-none bg-tertiary border-b border-default"
      style={{
        height: 'var(--titlebar-height)'
      }}
    >
      {/* Left side - App logo + Sidebar toggle */}
      <div className="flex items-center gap-2" data-no-drag>
        {/* App Logo */}
        <img
          src="/neutrino.png"
          alt="Neutrino"
          className="w-6 h-6 ml-2"
        />

        {/* Sidebar Pin Toggle */}
        {onToggleSidebarPin && (
          <>
            <Divider height="20px" margin="0" />
            <Tooltip
              content={sidebarMode === 'pinned' ? 'Unpin Sidebar' : 'Pin Sidebar'}
              placement="bottom"
            >
              <button
                onClick={onToggleSidebarPin}
                className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                style={{ color: 'var(--fg-secondary)' }}
              >
                {sidebarMode === 'pinned' ? (
                  <PanelLeftClose size={18} />
                ) : (
                  <PanelLeft size={18} />
                )}
              </button>
            </Tooltip>
          </>
        )}
      </div>

      {/* Center - Navigation + Search Bar */}
      <div className="flex items-center justify-center flex-1 h-full px-4 gap-2">
        <NavigationButtons />
        <SearchBar
          prefix={searchContext.prefix}
          placeholder={searchContext.placeholder}
          onClick={handleSearchClick}
        />
      </div>

      {/* Right side - Theme Toggle & Menu */}
      <ThemeToggle isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />

      {/* Divider */}
      <Divider height="28px" margin="0 8px" />

      {/* Right side - Window controls */}
      <WindowControls
        isMaximized={isMaximized}
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onClose={handleClose}
      />


    </div>
  );
};

export default TitleBar;
