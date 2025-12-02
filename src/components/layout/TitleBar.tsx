import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PanelLeft, PanelLeftClose } from 'lucide-react';
import { useTitleBarDrag, useSessionsContext } from '@/hooks';
import { SEARCH_CONTEXTS, DEFAULT_SEARCH_CONTEXT } from '@/constants/routes';
import WindowControls from './titlebar/WindowControls';
import SearchBar from './titlebar/SearchBar';
import NavigationButtons from './titlebar/NavigationButtons';
import Divider from '@/components/common/Divider';
import Tooltip from '@/components/common/Tooltip';
import SessionSelector from '@/components/sessions/SessionSelector';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Menu } from 'lucide-react';
interface TitleBarProps {
  sidebarMode?: 'floating' | 'pinned';
  onToggleSidebarPin?: () => void;
  onCreateSession?: () => void;
}

const TitleBar: React.FC<TitleBarProps> = ({
  sidebarMode,
  onToggleSidebarPin,
  onCreateSession,
}) => {
  const location = useLocation();
  const { sessions, currentSession, selectSession } = useSessionsContext();
  const [isTauri, setIsTauri] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closePreference, setClosePreference] = useState<'minimize' | 'exit' | null>(null);

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

    // If user has already chosen a preference this session, use it
    if (closePreference === 'minimize') {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().hide();
      return;
    } else if (closePreference === 'exit') {
      const { exit } = await import('@tauri-apps/plugin-process');
      await exit(0);
      return;
    }

    // Otherwise show the dialog
    setShowCloseDialog(true);
  };

  const handleConfirmMinimizeToTray = async () => {
    setShowCloseDialog(false);
    // TODO: Check if "don't ask again" is checked and save preference
    // For now, we save preference in memory (resets when app fully exits)
    setClosePreference('minimize');
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().hide();
  };

  const handleExitCompletely = async () => {
    setShowCloseDialog(false);
    // TODO: Check if "don't ask again" is checked and save preference
    setClosePreference('exit');
    const { exit } = await import('@tauri-apps/plugin-process');
    await exit(0);
  };

  return (
    <div
      id="titlebar"
      className="flex items-center justify-between select-none"
      style={{
        height: 'var(--titlebar-height)',
        backgroundColor: 'var(--bg-background)',
      }}
    >
      {/* Left side - App logo + Sidebar toggle + Session Selector */}
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

        {/* Session Selector */}
        <div style={{ minWidth: '180px' }}>
          <SessionSelector
            sessions={sessions}
            currentSession={currentSession}
            onSelectSession={selectSession}
            onCreateNew={onCreateSession || (() => { })}
          />
        </div>
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

      <Tooltip content="Menu" placement='bottom-left'>
        <button
          className="p-1 rounded hover:bg-[var(--bg-active)] transition-colors"
          data-no-drag
        >
          <Menu size={20} style={{ color: 'var(--fg-secondary)' }} />
        </button>
      </Tooltip>
      
      {/* Right side - Window controls */}
      <WindowControls
        isMaximized={isMaximized}
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onClose={handleClose}
      />

      {/* Close to Tray Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCloseDialog}
        title="Close Neutrino"
        message="Do you want to keep Neutrino running in the background or exit completely?"
        confirmLabel="Minimize to Tray"
        cancelLabel="Exit"
        onConfirm={handleConfirmMinimizeToTray}
        onCancel={handleExitCompletely}
        onClose={() => setShowCloseDialog(false)}
        variant="info"
        dismissible={false}
        showDontAskAgain={true}
      />
    </div>
  );
};

export default TitleBar;
