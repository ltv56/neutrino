import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Minus, Square, Copy, X, Search, ChevronLeft, ChevronRight, Menu, PanelLeftClose, PanelLeft, Sun, Moon } from 'lucide-react';
import SessionSelector from '@/components/sessions/SessionSelector';
import { SessionForm } from '@/components/sessions/SessionForm';
import { useSessionsContext } from '@/hooks';
import type { ResearchSession } from '@/types';
import { SEARCH_CONTEXTS, DEFAULT_SEARCH_CONTEXT } from '@/constants/routes';
import Tooltip from '@/components/common/Tooltip';

interface TitleBarProps {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

const TitleBar: React.FC<TitleBarProps> = ({ onToggleSidebar, sidebarOpen = true }) => {
  const location = useLocation();
  const [isTauri, setIsTauri] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const dragHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);

  // Session management - use shared context
  const { sessions, createSession, updateSession, currentSession, selectSession } = useSessionsContext();
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSession, setEditingSession] = useState<ResearchSession | null>(null);

  // Get search context based on current route
  const searchContext = SEARCH_CONTEXTS[location.pathname] || DEFAULT_SEARCH_CONTEXT;

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

        // Custom titlebar drag region implementation
        const titlebar = document.getElementById('titlebar');

        // Remove old listener if exists (StrictMode protection)
        if (titlebar && dragHandlerRef.current) {
          titlebar.removeEventListener('mousedown', dragHandlerRef.current);
        }

        const handleMouseDown = async (e: MouseEvent) => {
          const target = e.target as HTMLElement;

          // Skip if clicking on interactive elements (using [data-no-drag] attribute)
          if (target.closest('[data-no-drag]')) {
            return;
          }

          if (e.buttons === 1) {
            // Primary (left) button
            if (e.detail === 2) {
              // Double click - maximize/restore
              e.preventDefault();
              appWindow.toggleMaximize();
            } else {
              // Single click - only start dragging if NOT maximized
              const isMaximized = await appWindow.isMaximized();
              if (!isMaximized) {
                appWindow.startDragging();
              }
            }
          }
        };

        // Store handler in ref
        dragHandlerRef.current = handleMouseDown;

        if (titlebar) {
          titlebar.addEventListener('mousedown', handleMouseDown);
        }

        return () => {
          unlisten();
          if (titlebar && dragHandlerRef.current) {
            titlebar.removeEventListener('mousedown', dragHandlerRef.current);
          }
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
        height: '40px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Left side - App name + Sidebar toggle */}
      <div className="flex items-center gap-1">
        {/* App Title */}
        <div
          className="px-2 py-1 font-semibold text-md"
          style={{ color: 'var(--fg-primary)' }}
        >
          Neutrino
        </div>

        {/* Sidebar Toggle Button */}
        <Tooltip content={sidebarOpen ? "Close Sidebar" : "Open Sidebar"} placement='bottom-left'>
          <button
            onClick={onToggleSidebar}
            className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
            data-no-drag
          >
            {sidebarOpen ? (
              <PanelLeftClose size={20} style={{ color: 'var(--fg-primary)' }} />
            ) : (
              <PanelLeft size={20} style={{ color: 'var(--fg-primary)' }} />
            )}
          </button>
        </Tooltip>
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
        {/* Navigation Icons */}
        <div className="flex items-center gap-1" data-no-drag>
          <Tooltip content="Back" placement='bottom-right'>
            <button className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors">
              <ChevronLeft size={16} style={{ color: 'var(--fg-secondary)' }} />
            </button>
          </Tooltip>
          <Tooltip content="Forward" placement='bottom-left'>
            <button className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors">
              <ChevronRight size={16} style={{ color: 'var(--fg-secondary)' }} />
            </button>
          </Tooltip>
        </div>

        {/* Search Bar - Centered */}
        <div
          className="flex items-center gap-2 px-3 py-1 rounded w-full max-w-[400px] cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
          style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border)',
          }}
          onClick={handleSearchClick}
          data-no-drag
        >
          <Search size={14} style={{ color: 'var(--fg-secondary)' }} />
          {searchContext.prefix && (
            <span
              className="text-xs font-medium px-1.5 py-0.5 rounded"
              style={{
                color: 'var(--accent)',
                backgroundColor: 'var(--accent-muted)',
              }}
            >
              {searchContext.prefix}
            </span>
          )}
          <span className="text-xs flex-1" style={{ color: 'var(--fg-secondary)' }}>
            {searchContext.placeholder}
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
      <div className="flex items-center gap-1 h-full">
        <Tooltip content={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"} placement='bottom-right'>
          <button
            onClick={toggleTheme}
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

      {/* Divider */}
      <div style={{ width: '1px', height: '28px', backgroundColor: 'var(--border)', margin: '0 8px' }} />

      {/* Right side - Window controls */}
      <div className="flex items-center h-full" data-no-drag>
        <Tooltip content="Minimize" placement="bottom" fullHeight>
          <button
            onClick={handleMinimize}
            className="h-full px-4 hover:bg-[var(--bg-active)] transition-colors"
          >
            <Minus size={16} style={{ color: 'var(--fg-primary)' }} />
          </button>
        </Tooltip>
        <Tooltip content={isMaximized ? "Restore" : "Maximize"} placement="bottom" fullHeight>
          <button
            onClick={handleMaximize}
            className="h-full px-4 hover:bg-[var(--bg-active)] transition-colors"
          >
            {isMaximized ? (
              <Copy size={14} style={{ color: 'var(--fg-primary)', transform: 'scaleX(-1)' }} />
            ) : (
              <Square size={14} style={{ color: 'var(--fg-primary)' }} />
            )}
          </button>
        </Tooltip>
        <Tooltip content="Close" placement="bottom-left" fullHeight>
          <button
            onClick={handleClose}
            className="h-full px-4 hover:bg-red-600 transition-colors"
          >
            <X size={16} style={{ color: 'var(--fg-primary)' }} />
          </button>
        </Tooltip>
      </div>

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
