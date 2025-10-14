import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import SessionSelector from '@/components/sessions/SessionSelector';
import { SessionForm } from '@/components/sessions/SessionForm';
import { useSessionsContext, useTitleBarDrag } from '@/hooks';
import type { ResearchSession } from '@/types';
import { SEARCH_CONTEXTS, DEFAULT_SEARCH_CONTEXT } from '@/constants/routes';
import WindowControls from './titlebar/WindowControls';
import SearchBar from './titlebar/SearchBar';
import NavigationButtons from './titlebar/NavigationButtons';
import ThemeToggle from './titlebar/ThemeToggle';

const TitleBar: React.FC = () => {
  const location = useLocation();
  const [isTauri, setIsTauri] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);

  // Session management - use shared context
  const { sessions, createSession, updateSession, currentSession, selectSession } = useSessionsContext();
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSession, setEditingSession] = useState<ResearchSession | null>(null);

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
      className="flex items-center justify-between select-none"
      style={{
        height: 'var(--titlebar-height)',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Left side - App name */}
      <div className="flex items-center gap-1">
        {/* App Title */}
        <div
          className="px-2 py-1 font-semibold text-md"
          style={{ color: 'var(--fg-primary)' }}
        >
          Neutrino
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '28px', backgroundColor: 'var(--border)', margin: '0 8px' }} />

      {/* Session Selector - Between left and center */}
      <div className="flex items-center" data-no-drag>
        <SessionSelector
          sessions={sessions}
          currentSession={currentSession}
          onSelectSession={selectSession}
          onCreateNew={() => {
            setEditingSession(null);
            setShowSessionForm(true);
          }}
        />
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
      <div style={{ width: '1px', height: '28px', backgroundColor: 'var(--border)', margin: '0 8px' }} />

      {/* Right side - Window controls */}
      <WindowControls
        isMaximized={isMaximized}
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onClose={handleClose}
      />

      {/* Modals */}
      <SessionForm
        isOpen={showSessionForm}
        onClose={() => {
          setShowSessionForm(false);
          setEditingSession(null);
        }}
        onCreate={async (title, goal) => {
          const newSession = await createSession(title, goal);
          // Auto-switch to newly created session - pass object directly
          if (newSession) {
            selectSession(newSession);
          }
          return newSession;
        }}
        onUpdate={updateSession}
        editSession={editingSession}
      />
    </div>
  );
};

export default TitleBar;
